import { View, Text, StyleSheet } from "react-native";
import type { LocationUpdate, MovingState } from "@/lib/types/location";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";

interface LocationCardProps {
  update: LocationUpdate;
}

const stateConfig: Record<MovingState, { label: string; bgClass: string; textClass: string; colorKey: keyof ReturnType<typeof useColors> }> = {
  arrived: { label: "到着", bgClass: "bg-success/20", textClass: "text-success", colorKey: "success" },
  approaching: { label: "接近中", bgClass: "bg-warning/20", textClass: "text-warning", colorKey: "warning" },
  passing: { label: "通過中", bgClass: "bg-primary/20", textClass: "text-primary", colorKey: "primary" },
  moving: { label: "移動中", bgClass: "bg-muted/20", textClass: "text-muted", colorKey: "muted" },
};

// 未知のstate値に対するフォールバック
const defaultStateConfig = { label: "不明", bgClass: "bg-muted/20", textClass: "text-muted", colorKey: "muted" as const };

function formatCoordinate(value: number, type: "lat" | "lng"): string {
  const abs = Math.abs(value);
  const direction = type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${abs.toFixed(6)}° ${direction}`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
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
  const colors = useColors();
  // stateConfigに存在しない値の場合はフォールバックを使用
  const stateConf = stateConfig[update.state as MovingState] || defaultStateConfig;
  const stateLabel = stateConf.label === "不明" && update.state ? String(update.state) : stateConf.label;
  const borderColor = colors[stateConf.colorKey];

  return (
    <View className="bg-surface rounded-xl p-4 border border-border">
      {/* Header: Date and Device */}
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-row items-center">
          <Text className="text-muted text-sm mr-2">📅</Text>
          <Text className="text-foreground font-semibold">
            {formatDate(update.timestamp)}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-muted text-sm mr-1">📱</Text>
          <Text className="text-muted text-sm" numberOfLines={1}>
            {update.device}
          </Text>
        </View>
      </View>

      {/* Time */}
      <View className="flex-row items-center mb-3">
        <Text className="text-muted text-sm mr-2">🕐</Text>
        <Text className="text-foreground font-semibold">
          {formatTimestamp(update.timestamp)}
        </Text>
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
        <View 
          className={cn("px-3 py-1 rounded-full", stateConf.bgClass)}
          style={{ borderWidth: 1, borderColor }}
        >
          <Text className={cn("text-sm font-medium", stateConf.textClass)}>
            ● {stateLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}
