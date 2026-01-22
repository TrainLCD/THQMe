import { View, Text } from "react-native";
import type { LogData } from "@/lib/types/location";
import { cn } from "@/lib/utils";

interface LogCardProps {
  log: LogData;
}

const levelConfig: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string }> = {
  info: { label: "INFO", bgClass: "bg-primary/20", textClass: "text-primary", borderClass: "border-primary" },
  warn: { label: "WARN", bgClass: "bg-warning/20", textClass: "text-warning", borderClass: "border-warning" },
  warning: { label: "WARN", bgClass: "bg-warning/20", textClass: "text-warning", borderClass: "border-warning" },
  error: { label: "ERROR", bgClass: "bg-error/20", textClass: "text-error", borderClass: "border-error" },
  debug: { label: "DEBUG", bgClass: "bg-muted/20", textClass: "text-muted", borderClass: "border-muted" },
};

const logTypeConfig: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string }> = {
  app: { label: "APP", bgClass: "bg-success/20", textClass: "text-success", borderClass: "border-success" },
  system: { label: "SYSTEM", bgClass: "bg-warning/20", textClass: "text-warning", borderClass: "border-warning" },
  client: { label: "CLIENT", bgClass: "bg-primary/20", textClass: "text-primary", borderClass: "border-primary" },
};

const defaultLevelConfig = { label: "LOG", bgClass: "bg-muted/20", textClass: "text-muted", borderClass: "border-muted" };
const defaultLogTypeConfig = { label: "OTHER", bgClass: "bg-muted/20", textClass: "text-muted", borderClass: "border-muted" };

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

export function LogCard({ log }: LogCardProps) {
  const level = log.log?.level || "info";
  const levelConf = levelConfig[level] || defaultLevelConfig;
  const message = log.log?.message || "(no message)";
  const logType = log.log?.type || "";
  const logTypeConf = logTypeConfig[logType] || defaultLogTypeConfig;

  return (
    <View className="bg-surface rounded-xl p-4 border border-border">
      {/* Header: Date and Device */}
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-row items-center">
          <Text className="text-muted text-sm mr-2">📅</Text>
          <Text className="text-foreground font-semibold">
            {formatDate(log.timestamp)}
          </Text>
        </View>
        {log.device && (
          <View className="flex-row items-center">
            <Text className="text-muted text-sm mr-1">📱</Text>
            <Text className="text-muted text-sm" numberOfLines={1}>
              {log.device}
            </Text>
          </View>
        )}
      </View>

      {/* Time */}
      <View className="flex-row items-center mb-3">
        <Text className="text-muted text-sm mr-2">🕐</Text>
        <Text className="text-foreground font-semibold">
          {formatTimestamp(log.timestamp)}
        </Text>
      </View>

      {/* Message */}
      <View className="mb-3">
        <View className="flex-row items-start">
          <Text className="text-muted text-sm mr-2">💬</Text>
          <Text className="text-foreground flex-1">
            {message}
          </Text>
        </View>
      </View>

      {/* Level and Type Badges */}
      <View className="flex-row gap-2">
        <View className={cn("px-3 py-1 rounded-full border", levelConf.bgClass, levelConf.borderClass)}>
          <Text className={cn("text-sm font-medium", levelConf.textClass)}>
            ● {levelConf.label}
          </Text>
        </View>
        {logType && (
          <View className={cn("px-3 py-1 rounded-full border", logTypeConf.bgClass, logTypeConf.borderClass)}>
            <Text className={cn("text-sm font-medium", logTypeConf.textClass)}>
              {logTypeConf.label}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
