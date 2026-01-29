/**
 * 移動状態を表す型
 * - arrived: 到着
 * - approaching: 接近中
 * - passing: 通過中
 * - moving: 移動中
 */
export type MovingState = "arrived" | "approaching" | "passing" | "moving";

/**
 * 座標情報
 */
export interface Coords {
  accuracy: number | null | undefined;
  latitude: number;
  longitude: number;
  speed: number | null | undefined;
}

/**
 * バッテリーの充電状態
 */
export type BatteryState = "charging" | "unplugged" | "full" | "unknown";

/**
 * WebSocket経由で受信する位置情報更新データ
 */
export interface LocationUpdate {
  coords: Coords;
  device: string;
  id: string;
  state: MovingState;
  timestamp: number;
  type: "location_update";
  battery_level: number;
  battery_state: BatteryState | null;
}

/**
 * ログレベル
 * - info: 情報
 * - debug: デバッグ
 * - warn: 警告
 * - error: エラー
 */
export type LogLevel = "info" | "debug" | "warn" | "error";

/**
 * ログタイプ
 * - app: アプリケーションログ
 * - system: システムログ
 * - client: クライアントログ
 */
export type LogType = "app" | "system" | "client";

/**
 * ログの詳細情報（ネストされたオブジェクト）
 */
export interface LogInfo {
  type: LogType;
  level: LogLevel;
  message: string;
}

/**
 * WebSocket経由で受信するログデータ
 * 実際のデータ構造:
 * {
 *   "type": "log",
 *   "id": "xxx",
 *   "device": "iPhone 16",
 *   "timestamp": 1768743378562,
 *   "log": {
 *     "type": "app",
 *     "level": "info",
 *     "message": "Connected to the telemetry server as a app."
 *   }
 * }
 */
export interface LogData {
  type: "log";
  id: string;
  device: string;
  timestamp: number;
  log: LogInfo;
}

/**
 * WebSocket接続状態
 */
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * 位置情報ストアの状態
 */
export interface LocationState {
  updates: LocationUpdate[];
  logs: LogData[];
  connectionStatus: ConnectionStatus;
  wsUrl: string;
  error: string | null;
  messageCount: number;
  deviceIds: string[];
}

/**
 * 位置情報ストアのアクション
 */
export type LocationAction =
  | { type: "ADD_UPDATE"; payload: LocationUpdate }
  | { type: "ADD_LOG"; payload: LogData }
  | { type: "SET_CONNECTION_STATUS"; payload: ConnectionStatus }
  | { type: "SET_WS_URL"; payload: string }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_UPDATES" }
  | { type: "LOAD_INITIAL_STATE"; payload: Partial<LocationState> };
