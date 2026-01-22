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
 * WebSocket経由で受信する位置情報更新データ
 */
export interface LocationUpdate {
  coords: Coords;
  device: string;
  id: string;
  state: MovingState;
  timestamp: number;
  type: "location_update";
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
  | { type: "SET_CONNECTION_STATUS"; payload: ConnectionStatus }
  | { type: "SET_WS_URL"; payload: string }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_UPDATES" }
  | { type: "LOAD_INITIAL_STATE"; payload: Partial<LocationState> };
