import {
  LocationUpdateData,
  LogData,
  ReceivedDataSchema,
  UnknownData,
} from "@/domain/received";
import { useCallback, useEffect, useState } from "react";
import { useWebSocket } from "./useWebSocket";

export const useListenActivities = () => {
  const [activities, setActivities] = useState<LocationUpdateData[]>([]);
  const [logs, setLogs] = useState<LogData[]>([]);
  const [errors, setErrors] = useState<UnknownData[]>([]);

  const wsUrl = process.env.EXPO_PUBLIC_WEBSOCKET_ENDPOINT;
  if (!wsUrl) {
    throw new Error("EXPO_PUBLIC_WEBSOCKET_ENDPOINT is not defined");
  }

  const handleOpen = useCallback(() => {
    console.log("WebSocket connection established");
  }, []);

  const handleClose = useCallback(() => {
    console.log("WebSocket connection closed");
  }, []);

  const handleMessage = useCallback((message: MessageEvent) => {
    try {
      const data = ReceivedDataSchema.parse(message);

      if (data.type === "location_update") {
        setActivities((prev) => [data, ...prev]);
      }

      if (data.type === "log") {
        setLogs((prev) => [data, ...prev]);
      }

      if (data.type === "unknown") {
        setErrors((prev) => [data, ...prev]);
      }
    } catch (error) {
      console.error("WebSocket message parsing error:", error);
    }
  }, []);

  const handleError = useCallback((error: Event) => {
    console.error("WebSocket error:", error);
  }, []);

  const socket = useWebSocket({
    url: wsUrl,
    onOpen: handleOpen,
    onClose: handleClose,
    onMessage: handleMessage,
    onError: handleError,
  });

  useEffect(() => {
    if (socket.isConnected) {
      socket.send({ type: "subscribe" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.isConnected]);

  return { activities, logs, errors };
};
