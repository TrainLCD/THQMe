import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import type {
  LocationState,
  LocationAction,
  LocationUpdate,
  LogData,
  ConnectionStatus,
} from "./types/location";

// 固定のWebSocket設定
const WS_URL = "wss://analytics-internal.trainlcd.app/ws";
const WS_PROTOCOLS = ["thq", "thq-auth-8d4f609889f3a67352d52b46cc1e71e9c3d89fd0fea765af45ee0f5249c9a388"];

const MAX_UPDATES = 500; // 保持する最大更新数
const MAX_LOGS = 200; // 保持する最大ログ数

// 自動再接続設定
const RECONNECT_INITIAL_DELAY = 1000; // 初回再接続待機時間（1秒）
const RECONNECT_MAX_DELAY = 30000; // 最大再接続待機時間（30秒）
const RECONNECT_MULTIPLIER = 1.5; // 再接続待機時間の増加倍率

const initialState: LocationState = {
  updates: [],
  logs: [],
  connectionStatus: "disconnected",
  wsUrl: WS_URL,
  error: null,
  messageCount: 0,
  deviceIds: [],
};

function locationReducer(state: LocationState, action: LocationAction): LocationState {
  switch (action.type) {
    case "ADD_UPDATE": {
      const update = action.payload;
      const newUpdates = [update, ...state.updates].slice(0, MAX_UPDATES);
      const deviceIds = Array.from(
        new Set([update.device, ...state.deviceIds])
      );
      return {
        ...state,
        updates: newUpdates,
        messageCount: state.messageCount + 1,
        deviceIds,
      };
    }
    case "ADD_LOG": {
      const log = action.payload;
      const newLogs = [log, ...state.logs].slice(0, MAX_LOGS);
      return {
        ...state,
        logs: newLogs,
        messageCount: state.messageCount + 1,
      };
    }
    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };
    case "SET_WS_URL":
      return { ...state, wsUrl: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "CLEAR_UPDATES":
      return { ...state, updates: [], logs: [], messageCount: 0, deviceIds: [] };
    case "LOAD_INITIAL_STATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface LocationContextValue {
  state: LocationState;
  dispatch: React.Dispatch<LocationAction>;
  connect: () => void;
  disconnect: () => void;
  clearUpdates: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(locationReducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_INITIAL_DELAY);
  const shouldReconnectRef = useRef(true); // 自動再接続を有効にするフラグ

  // 再接続タイマーをクリア
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // 再接続をスケジュール
  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) {
      console.log("[WebSocket] Auto-reconnect disabled, not scheduling reconnect");
      return;
    }

    clearReconnectTimeout();

    const delay = reconnectDelayRef.current;
    console.log(`[WebSocket] Scheduling reconnect in ${delay}ms`);
    
    dispatch({ type: "SET_ERROR", payload: `再接続中... (${Math.round(delay / 1000)}秒後)` });

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log("[WebSocket] Attempting to reconnect...");
      // 次回の再接続待機時間を増加（指数バックオフ）
      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * RECONNECT_MULTIPLIER,
        RECONNECT_MAX_DELAY
      );
      connectInternal();
    }, delay);
  }, []);

  // 内部接続関数（再接続ロジック用）
  const connectInternal = useCallback(() => {
    // 既存の接続を閉じる
    if (wsRef.current) {
      wsRef.current.close();
    }

    console.log("[WebSocket] Connecting to:", WS_URL);
    console.log("[WebSocket] Using protocols:", WS_PROTOCOLS);
    dispatch({ type: "SET_CONNECTION_STATUS", payload: "connecting" });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      const ws = new WebSocket(WS_URL, WS_PROTOCOLS);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WebSocket] Connected to:", WS_URL);
        
        // 接続成功時に再接続待機時間をリセット
        reconnectDelayRef.current = RECONNECT_INITIAL_DELAY;
        
        // サーバーにsubscribeメッセージを送信
        const subscribeMessage = JSON.stringify({ type: "subscribe", device: "THQMe" });
        ws.send(subscribeMessage);
        console.log("[WebSocket] Sent subscribe message:", subscribeMessage);
        
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[WebSocket] Received message:", data);
          if (data.type === "location_update") {
            console.log("[WebSocket] Location update from device:", data.device, "coords:", data.coords);
            dispatch({ type: "ADD_UPDATE", payload: data as LocationUpdate });
          } else if (data.type === "log") {
            console.log("[WebSocket] Log message:", data.log?.message);
            dispatch({ type: "ADD_LOG", payload: data as LogData });
          } else {
            console.log("[WebSocket] Unknown message type:", data.type);
          }
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
          console.log("[WebSocket] Raw message:", event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Connection error:", error);
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
        dispatch({ type: "SET_ERROR", payload: "WebSocket接続エラー" });
      };

      ws.onclose = (event) => {
        console.log("[WebSocket] Connection closed. Code:", event.code, "Reason:", event.reason);
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });
        wsRef.current = null;

        // 自動再接続が有効で、正常終了でない場合は再接続をスケジュール
        // コード1000は正常終了、1001はページ離脱
        if (shouldReconnectRef.current && event.code !== 1000 && event.code !== 1001) {
          scheduleReconnect();
        } else if (shouldReconnectRef.current) {
          // 正常終了でも自動再接続が有効なら再接続
          scheduleReconnect();
        }
      };
    } catch (error) {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
      dispatch({ type: "SET_ERROR", payload: "WebSocket接続の作成に失敗しました" });
      
      // エラー時も再接続をスケジュール
      if (shouldReconnectRef.current) {
        scheduleReconnect();
      }
    }
  }, [scheduleReconnect]);

  // 外部から呼び出す接続関数
  const connect = useCallback(() => {
    shouldReconnectRef.current = true;
    reconnectDelayRef.current = RECONNECT_INITIAL_DELAY;
    clearReconnectTimeout();
    connectInternal();
  }, [connectInternal, clearReconnectTimeout]);

  // WebSocket切断（自動再接続も停止）
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();
    
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected"); // 正常終了コードを送信
      wsRef.current = null;
    }
    dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });
    dispatch({ type: "SET_ERROR", payload: null });
  }, [clearReconnectTimeout]);

  // 更新をクリア
  const clearUpdates = useCallback(() => {
    dispatch({ type: "CLEAR_UPDATES" });
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [clearReconnectTimeout]);

  const value: LocationContextValue = {
    state,
    dispatch,
    connect,
    disconnect,
    clearUpdates,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
