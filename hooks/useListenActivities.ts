import {
  LocationUpdateData,
  LogData,
  ReceivedDataSchema,
  UnknownData,
} from "@/domain/received";
import { useCallback, useEffect, useState } from "react";
import { useWebSocket } from "./useWebSocket";

const MAX_BUFFER = 500;

export const useListenActivities = () => {
  const [activities, setActivities] = useState<LocationUpdateData[]>([]);
  const [logs, setLogs] = useState<LogData[]>([]);
  const [errors, setErrors] = useState<UnknownData[]>([]);

  const wsUrl = process.env.EXPO_PUBLIC_WEBSOCKET_ENDPOINT;
  if (!wsUrl) {
    console.warn(
      "EXPO_PUBLIC_WEBSOCKET_ENDPOINT is not defined; skip WebSocket connection"
    );
  }

  const handleOpen = useCallback(() => {
    console.log("WebSocket connection established");
  }, []);

  const handleClose = useCallback(() => {
    console.log("WebSocket connection closed");
  }, []);

  const handleMessage = useCallback((payload: unknown) => {
    try {
      const data = ReceivedDataSchema.parse(payload);
      if (data.type === "location_update") {
        setActivities((prev) => [data, ...prev].slice(0, MAX_BUFFER));
      }

      if (data.type === "log") {
        setLogs((prev) => [data, ...prev].slice(0, MAX_BUFFER));
      }

      if (data.type === "unknown") {
        setErrors((prev) => [data, ...prev].slice(0, MAX_BUFFER));
      }
    } catch (error) {
      console.error("WebSocket message parsing error:", error);
    }
  }, []);

  const handleError = useCallback((error: unknown) => {
    console.error("WebSocket error:", error);
  }, []);

  const { isConnected, send } = useWebSocket({
    url: wsUrl,
    onOpen: handleOpen,
    onClose: handleClose,
    onMessage: handleMessage,
    onError: handleError,
    autoReconnect: true,
  });

  useEffect(() => {
    if (wsUrl && isConnected) {
      send({ type: "subscribe" });
    }
  }, [isConnected, send, wsUrl]);

  return { activities, logs, errors };
};
