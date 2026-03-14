import { memo, useMemo } from "react";
import { View, Text } from "react-native";
import type { LocationUpdate, MovingState, BatteryState } from "@/lib/types/location";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";
import { useLineNames } from "@/hooks/use-line-names";

interface LocationCardProps {
  update: LocationUpdate;
}

export const stateConfig: Record<MovingState, { label: string; bgClass: string; textClass: string; colorKey: keyof ReturnType<typeof useColors> }> = {
  arrived: { label: "到着", bgClass: "bg-success/20", textClass: "text-success", colorKey: "success" },
  approaching: { label: "接近中", bgClass: "bg-warning/20", textClass: "text-warning", colorKey: "warning" },
  passing: { label: "通過中", bgClass: "bg-primary/20", textClass: "text-primary", colorKey: "primary" },
  moving: { label: "移動中", bgClass: "bg-muted/20", textClass: "text-muted", colorKey: "muted" },
};

// 未知のstate値に対するフォールバック
export const defaultStateConfig = { label: "不明", bgClass: "bg-muted/20", textClass: "text-muted", colorKey: "muted" as const };

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

export function formatSpeed(speed: number | null | undefined): string {
  if (speed === null || speed === undefined || speed === -1) {
    return "-";
  }
  // m/s → km/h に変換 (x 3.6)
  const kmh = speed * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

export function formatAccuracy(accuracy: number | null | undefined): string {
  if (accuracy === null || accuracy === undefined) {
    return "-";
  }
  return `${accuracy.toFixed(0)}m`;
}

export function formatBatteryLevel(level: number): string {
  return `${Math.round(level * 100)}%`;
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  if (diffMs <= 0) {
    return "たった今";
  }
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return `${diffSec}秒前`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}分前`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour}時間前`;
  }
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) {
    return `${diffDay}日前`;
  }
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) {
    return `${diffMonth}ヶ月前`;
  }
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear}年前`;
}

const batteryStateLabels: Record<BatteryState, string> = {
  charging: "充電中",
  unplugged: "未接続",
  full: "満充電",
  unknown: "不明",
};

// Expo Battery.BatteryState の整数値に対応するマッピング
const batteryStateFromNumber: Record<number, BatteryState> = {
  0: "unknown",
  1: "unplugged",
  2: "charging",
  3: "full",
};

function formatBatteryState(state: BatteryState | number | null): string {
  if (state === null || state === undefined) return "-";
  if (typeof state === "number") {
    const mapped = batteryStateFromNumber[state];
    return mapped ? batteryStateLabels[mapped] : "不明";
  }
  return batteryStateLabels[state] || String(state);
}

export const LocationCard = memo(function LocationCard({ update }: LocationCardProps) {
  const colors = useColors();
  const lineIds = useMemo(() => (update.line_id ? [update.line_id] : []), [update.line_id]);
  const lineNames = useLineNames(lineIds);
  // stateConfigに存在しない値の場合はフォールバックを使用
  const stateConf = stateConfig[update.state as MovingState] || defaultStateConfig;
  const stateLabel = stateConf.label === "不明" && update.state ? String(update.state) : stateConf.label;
  const borderColor = colors[stateConf.colorKey];

  return (
    <View className="bg-surface rounded-xl p-4 border border-border">
      {/* Header: DateTime + Device + State Badge */}
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-row items-center">
          <Text className="text-foreground font-semibold text-base">
            🕐 {formatDate(update.timestamp)} {formatTimestamp(update.timestamp)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2 flex-shrink" style={{ maxWidth: "55%" }}>
          <View
            className={cn("px-2 py-0.5 rounded-full", stateConf.bgClass)}
            style={{ borderWidth: 1, borderColor }}
          >
            <Text className={cn("text-base font-medium", stateConf.textClass)}>
              {stateLabel}
            </Text>
          </View>
          <Text className="text-muted text-base flex-shrink" numberOfLines={1} ellipsizeMode="tail">
            {update.device}
          </Text>
        </View>
      </View>

      {/* Route Name */}
      {update.line_id && lineNames[update.line_id] && (
        <View className="flex-row items-center mb-1">
          <Text className="text-base mr-1">🚆</Text>
          <Text className="text-foreground text-base">{lineNames[update.line_id]}</Text>
        </View>
      )}

      {/* Coordinates */}
      <View className="flex-row items-center mb-2">
        <Text className="text-base mr-1">📍</Text>
        <Text className="text-foreground text-base">
          {formatCoordinate(update.coords.latitude, "lat")}, {formatCoordinate(update.coords.longitude, "lng")}
        </Text>
      </View>

      {/* Metrics */}
      <View className="flex-row mb-1">
        <View style={{ width: "33%" }}>
          <Text className="text-muted text-base">🏎️ {formatSpeed(update.coords.speed)}</Text>
        </View>
        <View style={{ width: "22%" }}>
          <Text className="text-muted text-base">🎯 {formatAccuracy(update.coords.accuracy)}</Text>
        </View>
      </View>
      <View className="flex-row">
        <View style={{ width: "33%" }}>
          <Text className="text-muted text-base">🔋 {formatBatteryLevel(update.battery_level)}</Text>
        </View>
        <View style={{ width: "22%" }}>
          <Text className="text-muted text-base">🔌 {formatBatteryState(update.battery_state)}</Text>
        </View>
      </View>
    </View>
  );
});
