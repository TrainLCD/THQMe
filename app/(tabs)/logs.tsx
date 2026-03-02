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
  TextInput,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  Easing,
} from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { LogCard } from "@/components/log-card";
import { ConnectionStatusBadge } from "@/components/connection-status";
import { useLocation } from "@/lib/location-store";
import type { LogData, LogType, LogLevel } from "@/lib/types/location";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";

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

// アコーディオンコンテンツの最大高さ（アニメーション用）
const ACCORDION_MAX_HEIGHT_BASE = 300; // タイプ + レベルフィルターのみ
const ACCORDION_MAX_HEIGHT_WITH_DEVICE = 400; // + デバイスフィルター

export default function LogsScreen() {
  const { state, clearUpdates } = useLocation();
  const colors = useColors();
  // 検索クエリ
  const [searchQuery, setSearchQuery] = useState("");
  // 複数選択用のSet
  const [selectedTypes, setSelectedTypes] = useState<Set<LogType>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set());
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // アニメーション用の共有値
  const rotateValue = useSharedValue(0);
  const maxHeightValue = useSharedValue(0);
  const opacityValue = useSharedValue(0);

  // 矢印の回転アニメーション
  const arrowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateValue.value}deg` }],
    };
  });

  // コンテンツの高さアニメーション
  const contentStyle = useAnimatedStyle(() => {
    return {
      maxHeight: maxHeightValue.value,
      opacity: opacityValue.value,
      overflow: "hidden" as const,
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

  // デバイスフィルターがある場合は最大高さを増やす
  const maxContentHeight = logDeviceIds.length > 0
    ? ACCORDION_MAX_HEIGHT_WITH_DEVICE
    : ACCORDION_MAX_HEIGHT_BASE;

  // フィルタリングされたログ
  const filteredLogs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return state.logs.filter((log) => {
      // テキスト検索フィルター
      if (query) {
        const message = log.log.message?.toLowerCase() || "";
        const device = log.device?.toLowerCase() || "";
        const type = log.log.type?.toLowerCase() || "";
        if (!message.includes(query) && !device.includes(query) && !type.includes(query)) {
          return false;
        }
      }
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
  }, [state.logs, searchQuery, selectedTypes, selectedLevels, selectedDevices]);

  // フィルターが適用されているかどうか
  const hasActiveFilter = searchQuery.trim() !== "" || selectedTypes.size > 0 || selectedLevels.size > 0 || selectedDevices.size > 0;

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
    
    const newValue = !isFilterExpanded;
    setIsFilterExpanded(newValue);
    
    // アニメーション設定
    const animConfig = {
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    };
    
    rotateValue.value = withTiming(newValue ? 180 : 0, animConfig);
    maxHeightValue.value = withTiming(newValue ? maxContentHeight : 0, animConfig);
    opacityValue.value = withTiming(newValue ? 1 : 0, { duration: newValue ? 250 : 150 });
  }, [isFilterExpanded, rotateValue, maxHeightValue, opacityValue, maxContentHeight]);

  // 検索クリア
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

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

  const ListEmpty = useMemo(
    () => (
      <View className="flex-1 items-center justify-center py-20">
        <Text style={{ fontSize: 64, lineHeight: 80 }} className="mb-4">📝</Text>
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
      {/* ヘッダー部分（スクロールに追従して固定表示） */}
      <View style={styles.stickyHeader}>
        {/* Header with status */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-foreground">ログ</Text>
          <ConnectionStatusBadge status={state.connectionStatus} />
        </View>

        {/* Search Box */}
        <View className="mb-4 bg-surface rounded-xl border border-border flex-row items-center px-3">
          <Text className="text-muted mr-2">🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="メッセージを検索..."
            placeholderTextColor={colors.muted}
            className="flex-1 text-foreground"
            style={{ fontSize: 16, paddingVertical: 16 }}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7}>
              <Text className="text-muted text-lg">✕</Text>
            </TouchableOpacity>
          )}
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
                {(selectedTypes.size > 0 || selectedLevels.size > 0 || selectedDevices.size > 0) && (
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

          {/* Accordion Content with Animation */}
          <Animated.View style={contentStyle}>
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

              {/* Device Filter (only show if there are devices) */}
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
          </Animated.View>
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

      <FlatList
        data={filteredLogs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // スクロール中に先頭へアイテムが追加されてもスクロール位置を維持する
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        // パフォーマンス最適化
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== "web"}
        updateCellsBatchingPeriod={50}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
