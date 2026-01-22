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

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const config = statusConfig[status];

  return (
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
  );
}
