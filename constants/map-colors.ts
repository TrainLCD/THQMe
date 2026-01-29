/**
 * マップ上でデバイス軌跡を表示する際の色パレット
 */
export const MAP_TRAJECTORY_COLORS = [
  "#FF6B6B", // 赤
  "#4ECDC4", // ティール
  "#45B7D1", // 水色
  "#96CEB4", // ミントグリーン
  "#FFEAA7", // 黄色
  "#DDA0DD", // プラム
  "#98D8C8", // シーグリーン
  "#F7DC6F", // ゴールド
  "#BB8FCE", // 紫
  "#85C1E9", // スカイブルー
] as const;

/**
 * デバイスIDからPolylineの色を取得
 * デバイスIDのハッシュ値を使って色を決定する
 */
export function getDeviceColor(deviceId: string, deviceIds: string[]): string {
  const index = deviceIds.indexOf(deviceId);
  if (index === -1) {
    return MAP_TRAJECTORY_COLORS[0];
  }
  return MAP_TRAJECTORY_COLORS[index % MAP_TRAJECTORY_COLORS.length];
}
