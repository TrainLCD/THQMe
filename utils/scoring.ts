/**
 * 誤差[m]を0〜100点に変換。
 *
 * 閾値:
 * g=12, y=35, r=80
 * m<=g         → 100
 * g<m<=y       → 100 - (m-g)*(40/(y-g))
 * y<m<=r       →  60 - (m-y)*(40/(r-y))
 * m>r or N/A   → 0
 *
 * 速度補正:
 * v>=90 → +10m
 * v>=50 → +5m
 *
 * @param m 誤差[m]。未定義やNaNは0点扱い
 * @param speedKmh 速度[km/h]。速いほど閾値を甘くする
 * @returns 0〜100点
 */
function accScoreLinear(m?: number, speedKmh = 0): number {
  if (typeof m !== "number" || !Number.isFinite(m)) return 0;

  let g = 12,
    y = 35,
    r = 80;
  if (speedKmh >= 90) {
    const boost = 10; // 90km/h以上は頭打ち
    g += boost;
    y += boost;
    r += boost;
  } else if (speedKmh >= 50) {
    const boost = 5 + ((speedKmh - 50) / 40) * 5; // 50→+5, 90手前→+10に近づく
    g += boost;
    y += boost;
    r += boost;
  }
  if (m <= g) return 100;
  if (m <= y) return 100 - (m - g) * (40 / (y - g));
  if (m <= r) return 60 - (m - y) * (40 / (r - y));
  return 0;
}

type Sample = {
  ts: number; // epoch ms
  accuracyM?: number; // m
  speedKmh?: number; // km/h
};

type Client = {
  id: string;
  samples: Sample[];
};

/**
 * クライアントのスコアを算出。
 *
 * 精度A: トリム平均(trim10%) of accScoreLinear
 * 鮮度F: t<=10 → 100,  t>=60 → 0,  else 100*(1-(t-10)/50)
 * 可用性V: min(1, 実受信数/期待受信数)*100
 * 合成: S_c = 0.85A + 0.10F + 0.05V
 *
 * @param c クライアント
 * @param now 現在時刻（epoch ms）
 * @param expectedHz 期待受信周波数[Hz]
 * @returns クライアントスコア（0〜100）
 */
function scoreClient(c: Client, now: number, expectedHz = 1): number | null {
  // 基本窓 + 自動拡張（疎なときだけ広げる）
  const BASE_W = 30_000; // 標準窓
  const MIN_SAMPLES = 3; // 少ない件数でも評価を開始
  const MAX_W = 90_000; // 上限 90s で古い悪化サンプルの影響を早めに切る

  const countBase = c.samples.reduce((n, s) => {
    const dt = now - s.ts;
    return n + (dt >= 0 && dt <= BASE_W ? 1 : 0);
  }, 0);
  const scale = countBase > 0 ? Math.ceil(MIN_SAMPLES / countBase) : 4; // 0件ならとりあえず4倍
  const W = Math.min(MAX_W, BASE_W * Math.max(1, scale));

  const win = c.samples.filter((s) => {
    const dt = now - s.ts;
    return dt >= 0 && dt <= W; // 未来/古過ぎ除外
  });

  if (!win.length) return null;

  const accs = win
    .map((s) => accScoreLinear(s.accuracyM, s.speedKmh ?? 0))
    .sort((a, b) => a - b);
  const trim = Math.floor(accs.length * 0.1);
  const trimmed =
    accs.length > 2 * trim ? accs.slice(trim, accs.length - trim) : accs;
  const A = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;

  const lastTs = win.reduce((mx, s) => (s.ts > mx ? s.ts : mx), -Infinity);
  const age = Math.max(0, (now - lastTs) / 1000);
  const F = age <= 10 ? 100 : age >= 60 ? 0 : 100 * (1 - (age - 10) / 50);

  // 可用性：実測Hz/期待Hzの比率 r にバッファを設けて減点を緩和
  const Wsec = W / 1000;
  const actualHz = win.length / Wsec; // 実測到着頻度
  const r = expectedHz > 0 ? actualHz / expectedHz : 1; // 比率
  // r>=0.8 なら満点、r<=0.3 で0点、間は線形（地理的疎化に強くする）
  const V = Math.max(0, Math.min(1, (r - 0.3) / (0.8 - 0.3))) * 100;

  const Veff = V * (F / 100); // 鮮度が悪い時ほど可用性の減点を効かせる

  const S = 0.85 * A + 0.1 * F + 0.05 * Veff;

  return S;
}

/**
 * 全体スコアとラベルを算出。
 *
 * P50 = median(S_c)
 * 赤率R = S_c<40 の割合
 * 黄率Y = 40<=S_c<70 の割合
 *
 * Good:    P50>=80 && R<0.05 && Y<0.20
 * Poor:    P50<50 || R>=0.15
 * Moderate: その他
 *
 * @param clients クライアント配列
 * @param now 現在時刻（epoch ms）
 * @param expectedHz 期待受信周波数[Hz]
 * @returns p50, redRatio, yellowRatio, label
 */
export function calcOverallScore(
  clients: Client[],
  now: number,
  expectedHz = 1
) {
  const raw = clients.map((c) => scoreClient(c, now, expectedHz));
  const scores = raw
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s))
    .sort((a, b) => a - b);
  const p50 = scores.length
    ? scores.length % 2 === 1
      ? scores[Math.floor(scores.length / 2)]
      : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
    : 0;
  const total = Math.max(1, scores.length);
  const R = scores.filter((s) => s < 40).length / total;
  const Y = scores.filter((s) => s >= 40 && s < 70).length / total;
  let label: "Good" | "Moderate" | "Poor" = "Moderate";
  if (p50 >= 80 && R < 0.05 && Y < 0.2) label = "Good";
  else if (p50 < 50 || R >= 0.15) label = "Poor";
  return { p50, redRatio: R, yellowRatio: Y, label };
}
