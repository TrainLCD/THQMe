import { useState, useMemo, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { LogCard } from "@/components/log-card";
import { ConnectionStatusBadge } from "@/components/connection-status";
import { useLocation } from "@/lib/location-store";
import type { LogData, LogType, LogLevel } from "@/lib/types/location";
import { cn } from "@/lib/utils";

// フィルターオプションの定義
const LOG_TYPES: { value: LogType | null; label: string }[] = [
  { value: null, label: "すべて" },
  { value: "app", label: "APP" },
  { value: "system", label: "SYSTEM" },
  { value: "client", label: "CLIENT" },
];

const LOG_LEVELS: { value: LogLevel | null; label: string }[] = [
  { value: null, label: "すべて" },
  { value: "info", label: "INFO" },
  { value: "debug", label: "DEBUG" },
  { value: "warn", label: "WARN" },
  { value: "error", label: "ERROR" },
];

export default function LogsScreen() {
  const { state, clearUpdates } = useLocation();
  const [selectedType, setSelectedType] = useState<LogType | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  // ログからユニークなデバイスIDを抽出
  const logDeviceIds = useMemo(() => {
    const deviceSet = new Set<string>();
    state.logs.forEach((log) => {
      if (log.device) {
        deviceSet.add(log.device);
      }
    });
    return Array.from(deviceSet).sort();
  }, [state.logs]);

  // フィルタリングされたログ
  const filteredLogs = useMemo(() => {
    return state.logs.filter((log) => {
      // タイプフィルター
      if (selectedType && log.log.type !== selectedType) {
        return false;
      }
      // レベルフィルター
      if (selectedLevel && log.log.level !== selectedLevel) {
        return false;
      }
      // デバイスフィルター
      if (selectedDevice && log.device !== selectedDevice) {
        return false;
      }
      return true;
    });
  }, [state.logs, selectedType, selectedLevel, selectedDevice]);

  const handleClearData = useCallback(() => {
    if (Platform.OS === "web") {
      if (confirm("すべてのデータをクリアしますか？")) {
        clearUpdates();
      }
    } else {
      Alert.alert(
        "データクリア",
        "すべてのデータをクリアしますか？",
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "クリア",
            style: "destructive",
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              clearUpdates();
            },
          },
        ]
      );
    }
  }, [clearUpdates]);

  const handleFilterSelect = useCallback(
    (
      type: "type" | "level" | "device",
      value: LogType | LogLevel | string | null
    ) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (type === "type") {
        setSelectedType(value as LogType | null);
      } else if (type === "level") {
        setSelectedLevel(value as LogLevel | null);
      } else {
        setSelectedDevice(value as string | null);
      }
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: LogData }) => (
      <View className="mb-3">
        <LogCard log={item} />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: LogData, index: number) => {
    return item.id || `log-${item.timestamp}-${index}`;
  }, []);

  const ListHeader = useMemo(
    () => (
      <View className="mb-4">
        {/* Header with status */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-foreground">ログ</Text>
          <ConnectionStatusBadge status={state.connectionStatus} />
        </View>

        {/* Type Filter */}
        <View className="mb-3">
          <Text className="text-sm text-muted mb-2">タイプ</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {LOG_TYPES.map((option) => (
              <TouchableOpacity
                key={option.label}
                onPress={() => handleFilterSelect("type", option.value)}
                activeOpacity={0.7}
                style={styles.filterButton}
              >
                <View
                  className={cn(
                    "px-3 py-2 rounded-full border",
                    selectedType === option.value
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-medium",
                      selectedType === option.value ? "text-white" : "text-foreground"
                    )}
                  >
                    {option.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Level Filter */}
        <View className="mb-3">
          <Text className="text-sm text-muted mb-2">レベル</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {LOG_LEVELS.map((option) => (
              <TouchableOpacity
                key={option.label}
                onPress={() => handleFilterSelect("level", option.value)}
                activeOpacity={0.7}
                style={styles.filterButton}
              >
                <View
                  className={cn(
                    "px-3 py-2 rounded-full border",
                    selectedLevel === option.value
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-medium",
                      selectedLevel === option.value ? "text-white" : "text-foreground"
                    )}
                  >
                    {option.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Device Filter */}
        {logDeviceIds.length > 0 && (
          <View className="mb-3">
            <Text className="text-sm text-muted mb-2">デバイス</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              <TouchableOpacity
                onPress={() => handleFilterSelect("device", null)}
                activeOpacity={0.7}
                style={styles.filterButton}
              >
                <View
                  className={cn(
                    "px-3 py-2 rounded-full border",
                    !selectedDevice
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-medium",
                      !selectedDevice ? "text-white" : "text-foreground"
                    )}
                  >
                    すべて
                  </Text>
                </View>
              </TouchableOpacity>
              {logDeviceIds.map((device) => (
                <TouchableOpacity
                  key={device}
                  onPress={() => handleFilterSelect("device", device)}
                  activeOpacity={0.7}
                  style={styles.filterButton}
                >
                  <View
                    className={cn(
                      "px-3 py-2 rounded-full border",
                      selectedDevice === device
                        ? "bg-primary border-primary"
                        : "bg-surface border-border"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-medium",
                        selectedDevice === device ? "text-white" : "text-foreground"
                      )}
                      numberOfLines={1}
                    >
                      {device}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Count info */}
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-muted">
            {filteredLogs.length} 件のログ
            {(selectedType || selectedLevel || selectedDevice) && (
              <Text className="text-muted"> (全{state.logs.length}件)</Text>
            )}
          </Text>
          {state.logs.length > 0 && (
            <TouchableOpacity onPress={handleClearData} activeOpacity={0.7}>
              <Text className="text-sm text-error">クリア</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    ),
    [
      state.connectionStatus,
      state.logs.length,
      selectedType,
      selectedLevel,
      selectedDevice,
      logDeviceIds,
      filteredLogs.length,
      handleClearData,
      handleFilterSelect,
    ]
  );

  const ListEmpty = useMemo(
    () => (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-6xl mb-4">📝</Text>
        <Text className="text-lg font-semibold text-foreground mb-2">
          {selectedType || selectedLevel || selectedDevice
            ? "条件に一致するログがありません"
            : "ログがありません"}
        </Text>
        <Text className="text-sm text-muted text-center px-8">
          {selectedType || selectedLevel || selectedDevice
            ? "フィルター条件を変更してください"
            : "WebSocketに接続してログデータを受信してください"}
        </Text>
      </View>
    ),
    [selectedType, selectedLevel, selectedDevice]
  );

  return (
    <ScreenContainer>
      <FlatList
        data={filteredLogs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterButton: {
    marginBottom: 4,
  },
});
