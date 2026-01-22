import { View, Text } from "react-native";
import type { LogData } from "@/lib/types/location";
import { cn } from "@/lib/utils";

interface LogCardProps {
  log: LogData;
}

const levelConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  info: { label: "INFO", bgClass: "bg-primary", textClass: "text-white" },
  warn: { label: "WARN", bgClass: "bg-warning", textClass: "text-white" },
  warning: { label: "WARN", bgClass: "bg-warning", textClass: "text-white" },
  error: { label: "ERROR", bgClass: "bg-error", textClass: "text-white" },
  debug: { label: "DEBUG", bgClass: "bg-muted", textClass: "text-white" },
};

const logTypeConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  app: { label: "APP", bgClass: "bg-success", textClass: "text-white" },
  system: { label: "SYSTEM", bgClass: "bg-warning", textClass: "text-white" },
  client: { label: "CLIENT", bgClass: "bg-primary", textClass: "text-white" },
};

const defaultLevelConfig = { label: "LOG", bgClass: "bg-muted", textClass: "text-white" };
const defaultLogTypeConfig = { label: "OTHER", bgClass: "bg-muted", textClass: "text-white" };

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
        <View className={cn("px-3 py-1 rounded-full", levelConf.bgClass)}>
          <Text className={cn("text-sm font-medium", levelConf.textClass)}>
            ● {levelConf.label}
          </Text>
        </View>
        {logType && (
          <View className={cn("px-3 py-1 rounded-full", logTypeConf.bgClass)}>
            <Text className={cn("text-sm font-medium", logTypeConf.textClass)}>
              {logTypeConf.label}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
