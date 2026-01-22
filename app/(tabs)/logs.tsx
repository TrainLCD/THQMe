import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  LayoutAnimation,
  UIManager,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { LogCard } from "@/components/log-card";
import { ConnectionStatusBadge } from "@/components/connection-status";
import { useLocation } from "@/lib/location-store";
import type { LogData, LogType, LogLevel } from "@/lib/types/location";
import { cn } from "@/lib/utils";

// AndroidでLayoutAnimationを有効化
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// フィルターオプションの定義
const LOG_TYPES: { value: LogType; label: string }[] = [
  { value: "app", label: "APP" },
  { value: "system", label: "SYSTEM" },
  { value: "client", label: "CLIENT" },
];

const LOG_LEVELS: { value: LogLevel; label: string }[] = [
  { value: "info", label: "INFO" },
  { value: "debug", label: "DEBUG" },
  { value: "warn", label: "WARN" },
  { value: "error", label: "ERROR" },
];

// カスタムアニメーション設定
const accordionAnimation = {
  duration: 250,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

export default function LogsScreen() {
  const { state, clearUpdates } = useLocation();
  // 複数選択用のSet
  const [selectedTypes, setSelectedTypes] = useState<Set<LogType>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set());
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // アニメーション用の共有値
  const rotateValue = useSharedValue(0);

  // 矢印の回転アニメーション
  const arrowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateValue.value}deg` }],
    };
  });

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
      // タイプフィルター（空の場合は全て表示）
      if (selectedTypes.size > 0 && !selectedTypes.has(log.log.type)) {
        return false;
      }
      // レベルフィルター（空の場合は全て表示）
      if (selectedLevels.size > 0 && !selectedLevels.has(log.log.level)) {
        return false;
      }
      // デバイスフィルター（空の場合は全て表示）
      if (selectedDevices.size > 0 && !selectedDevices.has(log.device)) {
        return false;
      }
      return true;
    });
  }, [state.logs, selectedTypes, selectedLevels, selectedDevices]);

  // フィルターが適用されているかどうか
  const hasActiveFilter = selectedTypes.size > 0 || selectedLevels.size > 0 || selectedDevices.size > 0;

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

  // タイプフィルターの選択/解除
  const handleTypeSelect = useCallback((value: LogType | null) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (value === null) {
      // 「すべて」を選択した場合は全解除
      setSelectedTypes(new Set());
    } else {
      setSelectedTypes((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        return newSet;
      });
    }
  }, []);

  // レベルフィルターの選択/解除
  const handleLevelSelect = useCallback((value: LogLevel | null) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (value === null) {
      // 「すべて」を選択した場合は全解除
      setSelectedLevels(new Set());
    } else {
      setSelectedLevels((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        return newSet;
      });
    }
  }, []);

  // デバイスフィルターの選択/解除
  const handleDeviceSelect = useCallback((value: string | null) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (value === null) {
      // 「すべて」を選択した場合は全解除
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        return newSet;
      });
    }
  }, []);

  const toggleFilter = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // LayoutAnimationを設定してから状態を変更
    LayoutAnimation.configureNext(accordionAnimation);
    setIsFilterExpanded((prev) => {
      const newValue = !prev;
      rotateValue.value = withTiming(newValue ? 180 : 0, { duration: 250 });
      return newValue;
    });
  }, [rotateValue]);

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

        {/* Filter Accordion */}
        <View className="mb-4 bg-surface rounded-xl border border-border overflow-hidden">
          {/* Accordion Header */}
          <TouchableOpacity
            onPress={toggleFilter}
            activeOpacity={0.7}
            style={styles.accordionHeader}
          >
            <View className="flex-1 flex-row items-center justify-between px-4">
              <View className="flex-row items-center">
                <Text className="text-base font-medium text-foreground">
                  フィルター
                </Text>
                {hasActiveFilter && (
                  <View className="ml-2 bg-primary px-2 py-0.5 rounded-full">
                    <Text className="text-xs text-white font-medium">適用中</Text>
                  </View>
                )}
              </View>
              <Animated.Text style={[styles.arrowIcon, arrowStyle]}>
                ▼
              </Animated.Text>
            </View>
          </TouchableOpacity>

          {/* Accordion Content */}
          {isFilterExpanded && (
            <View className="px-4 pb-4 border-t border-border">
              {/* Type Filter */}
              <View className="mt-3">
                <Text className="text-sm text-muted mb-2">タイプ</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterScrollContent}
                >
                  {/* すべてボタン */}
                  <TouchableOpacity
                    onPress={() => handleTypeSelect(null)}
                    activeOpacity={0.7}
                    style={styles.filterButton}
                  >
                    <View
                      className={cn(
                        "px-3 py-2 rounded-full border",
                        selectedTypes.size === 0
                          ? "bg-primary border-primary"
                          : "bg-background border-border"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm font-medium",
                          selectedTypes.size === 0 ? "text-white" : "text-foreground"
                        )}
                      >
                        すべて
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {LOG_TYPES.map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      onPress={() => handleTypeSelect(option.value)}
                      activeOpacity={0.7}
                      style={styles.filterButton}
                    >
                      <View
                        className={cn(
                          "px-3 py-2 rounded-full border",
                          selectedTypes.has(option.value)
                            ? "bg-primary border-primary"
                            : "bg-background border-border"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-medium",
                            selectedTypes.has(option.value) ? "text-white" : "text-foreground"
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
              <View className="mt-3">
                <Text className="text-sm text-muted mb-2">レベル</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterScrollContent}
                >
                  {/* すべてボタン */}
                  <TouchableOpacity
                    onPress={() => handleLevelSelect(null)}
                    activeOpacity={0.7}
                    style={styles.filterButton}
                  >
                    <View
                      className={cn(
                        "px-3 py-2 rounded-full border",
                        selectedLevels.size === 0
                          ? "bg-primary border-primary"
                          : "bg-background border-border"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm font-medium",
                          selectedLevels.size === 0 ? "text-white" : "text-foreground"
                        )}
                      >
                        すべて
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {LOG_LEVELS.map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      onPress={() => handleLevelSelect(option.value)}
                      activeOpacity={0.7}
                      style={styles.filterButton}
                    >
                      <View
                        className={cn(
                          "px-3 py-2 rounded-full border",
                          selectedLevels.has(option.value)
                            ? "bg-primary border-primary"
                            : "bg-background border-border"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-medium",
                            selectedLevels.has(option.value) ? "text-white" : "text-foreground"
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
                <View className="mt-3">
                  <Text className="text-sm text-muted mb-2">デバイス</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                  >
                    {/* すべてボタン */}
                    <TouchableOpacity
                      onPress={() => handleDeviceSelect(null)}
                      activeOpacity={0.7}
                      style={styles.filterButton}
                    >
                      <View
                        className={cn(
                          "px-3 py-2 rounded-full border",
                          selectedDevices.size === 0
                            ? "bg-primary border-primary"
                            : "bg-background border-border"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-medium",
                            selectedDevices.size === 0 ? "text-white" : "text-foreground"
                          )}
                        >
                          すべて
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {logDeviceIds.map((device) => (
                      <TouchableOpacity
                        key={device}
                        onPress={() => handleDeviceSelect(device)}
                        activeOpacity={0.7}
                        style={styles.filterButton}
                      >
                        <View
                          className={cn(
                            "px-3 py-2 rounded-full border",
                            selectedDevices.has(device)
                              ? "bg-primary border-primary"
                              : "bg-background border-border"
                          )}
                        >
                          <Text
                            className={cn(
                              "text-sm font-medium",
                              selectedDevices.has(device) ? "text-white" : "text-foreground"
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
            </View>
          )}
        </View>

        {/* Count info */}
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-muted">
            {filteredLogs.length} 件のログ
            {hasActiveFilter && (
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
      selectedTypes,
      selectedLevels,
      selectedDevices,
      logDeviceIds,
      filteredLogs.length,
      hasActiveFilter,
      isFilterExpanded,
      handleClearData,
      handleTypeSelect,
      handleLevelSelect,
      handleDeviceSelect,
      toggleFilter,
      arrowStyle,
    ]
  );

  const ListEmpty = useMemo(
    () => (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-6xl mb-4">📝</Text>
        <Text className="text-lg font-semibold text-foreground mb-2">
          {hasActiveFilter
            ? "条件に一致するログがありません"
            : "ログがありません"}
        </Text>
        <Text className="text-sm text-muted text-center px-8">
          {hasActiveFilter
            ? "フィルター条件を変更してください"
            : "WebSocketに接続してログデータを受信してください"}
        </Text>
      </View>
    ),
    [hasActiveFilter]
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
  accordionHeader: {
    minHeight: 56,
    justifyContent: "center",
  },
  arrowIcon: {
    fontSize: 12,
    color: "#687076",
  },
});
