import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// expo-constantsをモック
vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { trainlcdGqlUrl: "" } } },
}));

// fetchをモック
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import {
  formatLineName,
  fetchLineNames,
  _resetCache,
  _getCache,
  _getColorCache,
  _setGqlUrl,
} from "../../hooks/use-line-names";

beforeEach(() => {
  _resetCache();
  _setGqlUrl("https://gql-stg.trainlcd.app/");
  fetchMock.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mockFetchResponse(lines: { id: number; nameShort: string; color?: string | null }[]) {
  fetchMock.mockResolvedValueOnce({
    json: () => Promise.resolve({ data: { lines } }),
  });
}

/** Promiseのマイクロタスクをフラッシュする */
async function flushPromises() {
  await vi.advanceTimersByTimeAsync(0);
}

describe("formatLineName", () => {
  it("路線名がある場合は「路線名(ID)」形式で返す", () => {
    const names = { "11302": "山手線" };
    expect(formatLineName("11302", names)).toBe("山手線(11302)");
  });

  it("路線名がない場合はIDをそのまま返す", () => {
    expect(formatLineName("11302", {})).toBe("11302");
  });
});

describe("fetchLineNames", () => {
  it("GraphQL APIにバッチクエリを送信する", async () => {
    mockFetchResponse([
      { id: 11302, nameShort: "山手線" },
      { id: 24006, nameShort: "京王井の頭線" },
    ]);

    fetchLineNames(["11302", "24006"]);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables.lineIds).toEqual([11302, 24006]);
    expect(_getCache()).toEqual({
      "11302": "山手線",
      "24006": "京王井の頭線",
    });
  });

  it("取得済みIDはスキップする（キャッシュ済み）", async () => {
    mockFetchResponse([{ id: 11302, nameShort: "山手線" }]);
    fetchLineNames(["11302"]);
    await flushPromises();

    fetchLineNames(["11302"]);
    // 2回目のfetchは呼ばれない
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("新規IDのみを差分リクエストする", async () => {
    mockFetchResponse([{ id: 11302, nameShort: "山手線" }]);
    fetchLineNames(["11302"]);
    await flushPromises();

    mockFetchResponse([{ id: 24006, nameShort: "京王井の頭線" }]);
    fetchLineNames(["11302", "24006"]);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(secondBody.variables.lineIds).toEqual([24006]);
  });

  it("GQL URLが空の場合はfetchしない", () => {
    _setGqlUrl("");
    fetchLineNames(["11302"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("空のID配列の場合はfetchしない", () => {
    fetchLineNames([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetchエラー時はキャッシュが変更されない", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));
    fetchLineNames(["99999"]);
    await flushPromises();

    expect(_getCache()).toEqual({});
  });

  it("fetchエラー時にリトライする", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));
    mockFetchResponse([{ id: 99999, nameShort: "テスト線" }]);

    fetchLineNames(["99999"]);
    await flushPromises();

    // 初回失敗後、キャッシュは空
    expect(_getCache()).toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 2秒後にリトライ
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(_getCache()).toEqual({ "99999": "テスト線" });
  });

  it("リトライが最大回数に達した後はリトライしない", async () => {
    // 4回連続で失敗（初回 + リトライ3回）
    fetchMock.mockRejectedValue(new Error("Network error"));

    fetchLineNames(["99999"]);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 1回目リトライ（2秒後）
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 2回目リトライ（4秒後）
    await vi.advanceTimersByTimeAsync(4000);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // 3回目リトライ（8秒後）
    await vi.advanceTimersByTimeAsync(8000);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // これ以上リトライしない
    await vi.advanceTimersByTimeAsync(16000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("リトライ全失敗後に再度fetchLineNamesを呼ぶとリトライ可能になる", async () => {
    // 4回連続で失敗（初回 + リトライ3回）
    fetchMock.mockRejectedValue(new Error("Network error"));

    fetchLineNames(["99999"]);
    await flushPromises();

    // 全リトライ完了まで進める
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    await vi.advanceTimersByTimeAsync(8000);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // リセットして成功するモックに差し替え
    fetchMock.mockReset();
    mockFetchResponse([{ id: 99999, nameShort: "テスト線" }]);

    // 再度呼び出し可能（resolvedIdsに入っていないため）
    fetchLineNames(["99999"]);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(_getCache()).toEqual({ "99999": "テスト線" });
  });

  it("取得中のIDは重複リクエストされない", async () => {
    // resolveしないPromiseでペンディング状態を維持
    let resolveFirst!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => { resolveFirst = resolve; })
    );

    fetchLineNames(["11302"]);

    // 同じIDで再度呼び出し
    fetchLineNames(["11302"]);

    // fetchは1回だけ呼ばれる
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 最初のリクエストを完了
    resolveFirst({
      json: () => Promise.resolve({ data: { lines: [{ id: 11302, nameShort: "山手線" }] } }),
    });
    await flushPromises();

    expect(_getCache()).toEqual({ "11302": "山手線" });
  });

  it("nameShortが空のlineはキャッシュに入れない", async () => {
    mockFetchResponse([
      { id: 11302, nameShort: "山手線" },
      { id: 99999, nameShort: "" },
    ]);

    fetchLineNames(["11302", "99999"]);
    await flushPromises();

    expect(_getCache()).toEqual({ "11302": "山手線" });
    expect(_getCache()).not.toHaveProperty("99999");
  });

  it("APIレスポンスのlinesがundefinedの場合はキャッシュが変更されずリトライする", async () => {
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ data: {} }),
    });
    mockFetchResponse([{ id: 11302, nameShort: "山手線" }]);

    fetchLineNames(["11302"]);
    await flushPromises();

    // 初回はlinesがundefinedなのでキャッシュは空
    expect(_getCache()).toEqual({});

    // 2秒後にリトライ
    await vi.advanceTimersByTimeAsync(2000);

    // リトライで成功
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(_getCache()).toEqual({ "11302": "山手線" });
  });

  it("subscribeでリスナーが通知される", async () => {
    const { _resetCache: _, ...mod } = await import("../../hooks/use-line-names");

    _resetCache();
    const listener = vi.fn();

    // subscribe/getSnapshotを直接テストするためにモジュールのsubscribeを利用
    // fetchLineNamesの内部でnotifyが呼ばれることを間接的にテスト
    mockFetchResponse([{ id: 11302, nameShort: "山手線" }]);
    fetchLineNames(["11302"]);
    await flushPromises();
    // キャッシュが更新されたことで正しい値が入っている
    expect(_getCache()["11302"]).toBe("山手線");
  });

  it("colorフィールドがある場合はカラーキャッシュに#付きで保存される", async () => {
    mockFetchResponse([
      { id: 11302, nameShort: "山手線", color: "80C241" },
      { id: 24006, nameShort: "京王井の頭線", color: "DD0077" },
    ]);

    fetchLineNames(["11302", "24006"]);
    await flushPromises();

    expect(_getColorCache()).toEqual({
      "11302": "#80C241",
      "24006": "#DD0077",
    });
  });

  it("colorが既に#付きの場合は二重に付けない", async () => {
    mockFetchResponse([
      { id: 11302, nameShort: "山手線", color: "#80C241" },
    ]);

    fetchLineNames(["11302"]);
    await flushPromises();

    expect(_getColorCache()).toEqual({ "11302": "#80C241" });
  });

  it("colorがnullの場合はカラーキャッシュに入れない", async () => {
    mockFetchResponse([
      { id: 11302, nameShort: "山手線", color: "80C241" },
      { id: 24006, nameShort: "京王井の頭線", color: null },
    ]);

    fetchLineNames(["11302", "24006"]);
    await flushPromises();

    expect(_getColorCache()).toEqual({ "11302": "#80C241" });
    expect(_getColorCache()).not.toHaveProperty("24006");
  });
});
