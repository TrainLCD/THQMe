import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import type { ConnectionStatus } from "@/lib/types/location";
import { cn } from "@/lib/utils";

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
}

const statusConfig: Record<ConnectionStatus, { label: string; bgClass: string; textClass: string }> = {
  connected: { label: "接続中", bgClass: "bg-success/20", textClass: "text-success" },
  connecting: { label: "接続中...", bgClass: "bg-warning/20", textClass: "text-warning" },
  disconnected: { label: "切断", bgClass: "bg-muted/20", textClass: "text-muted" },
  error: { label: "エラー", bgClass: "bg-error/20", textClass: "text-error" },
};

function useCurrentTime() {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    };

    const intervalId = setInterval(update, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return time;
}

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const config = statusConfig[status];
  const currentTime = useCurrentTime();

  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-sm font-bold text-black">{currentTime}</Text>
      <View className={cn("flex-row items-center px-3 py-1.5 rounded-full", config.bgClass)}>
        <View
          className={cn(
            "w-2 h-2 rounded-full mr-2",
            status === "connected" && "bg-success",
            status === "connecting" && "bg-warning",
            status === "disconnected" && "bg-muted",
            status === "error" && "bg-error"
          )}
        />
        <Text className={cn("text-sm font-medium", config.textClass)}>{config.label}</Text>
      </View>
    </View>
  );
}
