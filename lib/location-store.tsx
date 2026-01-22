import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  LocationState,
  LocationAction,
  LocationUpdate,
  ConnectionStatus,
} from "./types/location";

const STORAGE_KEY = "location_tracker_ws_url";
const MAX_UPDATES = 500; // 保持する最大更新数

const initialState: LocationState = {
  updates: [],
  connectionStatus: "disconnected",
  wsUrl: "",
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
  connect: (url: string) => void;
  disconnect: () => void;
  clearUpdates: () => void;
  setWsUrl: (url: string) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(locationReducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);

  // 初期化時にAsyncStorageからURLを読み込む
  useEffect(() => {
    const loadSavedUrl = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedUrl) {
          dispatch({ type: "SET_WS_URL", payload: savedUrl });
        }
      } catch (error) {
        console.error("Failed to load saved URL:", error);
      }
    };
    loadSavedUrl();
  }, []);

  // URLをAsyncStorageに保存
  const setWsUrl = useCallback(async (url: string) => {
    dispatch({ type: "SET_WS_URL", payload: url });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, url);
    } catch (error) {
      console.error("Failed to save URL:", error);
    }
  }, []);

  // WebSocket接続
  const connect = useCallback((url: string) => {
    // 既存の接続を閉じる
    if (wsRef.current) {
      wsRef.current.close();
    }

    dispatch({ type: "SET_CONNECTION_STATUS", payload: "connecting" });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "location_update") {
            dispatch({ type: "ADD_UPDATE", payload: data as LocationUpdate });
          }
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      ws.onerror = () => {
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
        dispatch({ type: "SET_ERROR", payload: "WebSocket connection error" });
      };

      ws.onclose = () => {
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
    setWsUrl,
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
