import { View, Text } from "react-native";
import type { LocationUpdate, MovingState } from "@/lib/types/location";
import { cn } from "@/lib/utils";

interface LocationCardProps {
  update: LocationUpdate;
}

const stateConfig: Record<MovingState, { label: string; bgClass: string; textClass: string }> = {
  moving: { label: "移動中", bgClass: "bg-success/20", textClass: "text-success" },
  stationary: { label: "停止中", bgClass: "bg-primary/20", textClass: "text-primary" },
  unknown: { label: "不明", bgClass: "bg-warning/20", textClass: "text-warning" },
};

function formatCoordinate(value: number, type: "lat" | "lng"): string {
  const abs = Math.abs(value);
  const direction = type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${abs.toFixed(6)}° ${direction}`;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatSpeed(speed: number | null | undefined): string {
  if (speed === null || speed === undefined || speed === -1) {
    return "-";
  }
  return `${speed.toFixed(1)} m/s`;
}

function formatAccuracy(accuracy: number | null | undefined): string {
  if (accuracy === null || accuracy === undefined) {
    return "-";
  }
  return `${accuracy.toFixed(0)}m`;
}

export function LocationCard({ update }: LocationCardProps) {
  const stateConf = stateConfig[update.state];

  return (
    <View className="bg-surface rounded-xl p-4 border border-border">
      {/* Header: Time and Device */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <Text className="text-muted text-sm mr-2">🕐</Text>
          <Text className="text-foreground font-semibold">
            {formatTimestamp(update.timestamp)}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-muted text-sm mr-1">📱</Text>
          <Text className="text-muted text-sm" numberOfLines={1}>
            {update.device}
          </Text>
        </View>
      </View>

      {/* Coordinates */}
      <View className="mb-3">
        <View className="flex-row items-center mb-1">
          <Text className="text-muted text-sm mr-2">📍</Text>
          <Text className="text-foreground">
            {formatCoordinate(update.coords.latitude, "lat")},{" "}
            {formatCoordinate(update.coords.longitude, "lng")}
          </Text>
        </View>
      </View>

      {/* Speed and Accuracy */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <Text className="text-muted text-sm mr-2">🚀</Text>
          <Text className="text-muted text-sm">Speed: </Text>
          <Text className="text-foreground">{formatSpeed(update.coords.speed)}</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-muted text-sm mr-2">⚡</Text>
          <Text className="text-muted text-sm">Acc: </Text>
          <Text className="text-foreground">{formatAccuracy(update.coords.accuracy)}</Text>
        </View>
      </View>

      {/* State Badge */}
      <View className="flex-row">
        <View className={cn("px-3 py-1 rounded-full", stateConf.bgClass)}>
          <Text className={cn("text-sm font-medium", stateConf.textClass)}>
            ● {stateConf.label}
          </Text>
        </View>
      </View>
    </View>
  );
}
