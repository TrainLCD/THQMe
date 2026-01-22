import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import type {
  LocationState,
  LocationAction,
  LocationUpdate,
  ConnectionStatus,
} from "./types/location";

// 固定のWebSocket設定
const WS_URL = "wss://analytics-internal.trainlcd.app/ws";
const WS_PROTOCOLS = ["thq", "thq-auth-8d4f609889f3a67352d52b46cc1e71e9c3d89fd0fea765af45ee0f5249c9a388"];

const MAX_UPDATES = 500; // 保持する最大更新数

const initialState: LocationState = {
  updates: [],
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
    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };
    case "SET_WS_URL":
      return { ...state, wsUrl: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "CLEAR_UPDATES":
      return { ...state, updates: [], messageCount: 0, deviceIds: [] };
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

  // WebSocket接続（固定URL・protocols使用）
  const connect = useCallback(() => {
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
        
        // サーバーにsubscribeメッセージを送信
        const subscribeMessage = JSON.stringify({ type: "subscribe" });
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
        dispatch({ type: "SET_ERROR", payload: "WebSocket connection error" });
      };

      ws.onclose = (event) => {
        console.log("[WebSocket] Connection closed. Code:", event.code, "Reason:", event.reason);
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });
        wsRef.current = null;
      };
    } catch (error) {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
      dispatch({ type: "SET_ERROR", payload: "Failed to create WebSocket connection" });
    }
  }, []);

  // WebSocket切断
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });
  }, []);

  // 更新をクリア
  const clearUpdates = useCallback(() => {
    dispatch({ type: "CLEAR_UPDATES" });
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

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
