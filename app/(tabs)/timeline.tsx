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
import { LocationCard } from "@/components/location-card";
import { ConnectionStatusBadge } from "@/components/connection-status";
import { useLocation } from "@/lib/location-store";
import type { LocationUpdate, MovingState } from "@/lib/types/location";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";
import { useLineNames, useLineColors } from "@/hooks/use-line-names";

// 状態フィルターオプションの定義
const MOVING_STATES: { value: MovingState; label: string }[] = [
  { value: "arrived", label: "到着" },
  { value: "approaching", label: "接近中" },
  { value: "passing", label: "通過中" },
  { value: "moving", label: "移動中" },
];

// アコーディオンコンテンツの最大高さ（アニメーション用）
const ACCORDION_MAX_HEIGHT_BASE = 200; // 状態フィルターのみ
const ACCORDION_MAX_HEIGHT_WITH_EXTRAS = 400; // 状態 + デバイス + 路線IDフィルター

export default function TimelineScreen() {
  const { state, clearUpdates } = useLocation();
  const colors = useColors();
  // 検索クエリ
  const [searchQuery, setSearchQuery] = useState("");
  // 複数選択用のSet
  const [selectedStates, setSelectedStates] = useState<Set<MovingState>>(new Set());
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const lineNames = useLineNames(state.lineIds);
  const lineColors = useLineColors(state.lineIds);

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

  // フィルター項目数に応じて最大高さを調整
  const hasExtras = state.deviceIds.length > 0 || state.lineIds.length > 0;
  const maxContentHeight = hasExtras
    ? ACCORDION_MAX_HEIGHT_WITH_EXTRAS
    : ACCORDION_MAX_HEIGHT_BASE;

  // Filter updates by search query, selected states, devices and routes
  const filteredUpdates = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return state.updates.filter((update) => {
      // テキスト検索フィルター
      if (query) {
        const device = update.device?.toLowerCase() || "";
        const stateStr = update.state?.toLowerCase() || "";
        const lat = update.coords?.latitude?.toString() || "";
        const lng = update.coords?.longitude?.toString() || "";
        const lineId = update.line_id?.toLowerCase() || "";
        if (!device.includes(query) && !stateStr.includes(query) && !lat.includes(query) && !lng.includes(query) && !lineId.includes(query)) {
          return false;
        }
      }
      // 状態フィルター（空の場合は全て表示）
      if (selectedStates.size > 0 && !selectedStates.has(update.state)) {
        return false;
      }
      // デバイスフィルター（空の場合は全て表示）
      if (selectedDevices.size > 0 && !selectedDevices.has(update.device)) {
        return false;
      }
      // 路線IDフィルター（空の場合は全て表示）
      if (selectedRoutes.size > 0) {
        if (!update.line_id || !selectedRoutes.has(update.line_id)) {
          return false;
        }
      }
      return true;
    });
  }, [state.updates, searchQuery, selectedStates, selectedDevices, selectedRoutes]);

  // フィルターが適用されているかどうか
  const hasActiveFilter = searchQuery.trim() !== "" || selectedStates.size > 0 || selectedDevices.size > 0 || selectedRoutes.size > 0;

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

  // 状態フィルターの選択/解除
  const handleStateSelect = useCallback((value: MovingState | null) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (value === null) {
      // 「すべて」を選択した場合は全解除
      setSelectedStates(new Set());
    } else {
      setSelectedStates((prev) => {
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

  // 路線IDフィルターの選択/解除
  const handleRouteSelect = useCallback((value: string | null) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (value === null) {
      setSelectedRoutes(new Set());
    } else {
      setSelectedRoutes((prev) => {
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
    ({ item }: { item: LocationUpdate }) => (
      <View className="mb-3">
        <LocationCard update={item} />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: LocationUpdate) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View className="mb-4">
        {/* Header with status */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-foreground">タイムライン</Text>
          <ConnectionStatusBadge status={state.connectionStatus} />
        </View>

        {/* Search Box */}
        <View className="mb-4 bg-surface rounded-xl border border-border flex-row items-center px-3">
          <Text className="text-muted mr-2">🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="タイムラインを検索..."
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
                {(selectedStates.size > 0 || selectedDevices.size > 0 || selectedRoutes.size > 0) && (
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
              {/* State Filter */}
              <View className="mt-3">
                <Text className="text-sm text-muted mb-2">状態</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterScrollContent}
                >
                  {/* すべてボタン */}
                  <TouchableOpacity
                    onPress={() => handleStateSelect(null)}
                    activeOpacity={0.7}
                    style={styles.filterButton}
                  >
                    <View
                      className={cn(
                        "px-3 py-2 rounded-full border",
                        selectedStates.size === 0
                          ? "bg-primary border-primary"
                          : "bg-background border-border"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm font-medium",
                          selectedStates.size === 0 ? "text-white" : "text-foreground"
                        )}
                      >
                        すべて
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {MOVING_STATES.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => handleStateSelect(option.value)}
                      activeOpacity={0.7}
                      style={styles.filterButton}
                    >
                      <View
                        className={cn(
                          "px-3 py-2 rounded-full border",
                          selectedStates.has(option.value)
                            ? "bg-primary border-primary"
                            : "bg-background border-border"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-medium",
                            selectedStates.has(option.value) ? "text-white" : "text-foreground"
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
              {state.deviceIds.length > 0 && (
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
                    {state.deviceIds.map((device) => (
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

              {/* Route ID Filter (only show if there are routes) */}
              {state.lineIds.length > 0 && (
                <View className="mt-3">
                  <Text className="text-sm text-muted mb-2">路線</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                  >
                    {/* すべてボタン */}
                    <TouchableOpacity
                      onPress={() => handleRouteSelect(null)}
                      activeOpacity={0.7}
                      style={styles.filterButton}
                    >
                      <View
                        className={cn(
                          "px-3 py-2 rounded-full border",
                          selectedRoutes.size === 0
                            ? "bg-primary border-primary"
                            : "bg-background border-border"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-medium",
                            selectedRoutes.size === 0 ? "text-white" : "text-foreground"
                          )}
                        >
                          すべて
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {state.lineIds.map((lineId) => {
                      const lineColor = lineColors[lineId];
                      const isSelected = selectedRoutes.has(lineId);
                      return (
                        <TouchableOpacity
                          key={lineId}
                          onPress={() => handleRouteSelect(lineId)}
                          activeOpacity={0.7}
                          style={styles.filterButton}
                        >
                          <View
                            className={cn(
                              "px-3 py-2 rounded-full",
                              !lineColor && "border",
                              !lineColor && (isSelected ? "bg-primary border-primary" : "bg-background border-border")
                            )}
                            style={lineColor ? {
                              backgroundColor: isSelected ? lineColor : "transparent",
                              borderWidth: 1,
                              borderColor: lineColor,
                            } : undefined}
                          >
                            <Text
                              className={cn(
                                "text-sm font-medium",
                                !lineColor && (isSelected ? "text-white" : "text-foreground")
                              )}
                              style={lineColor ? { color: isSelected ? "#FFFFFF" : lineColor } : undefined}
                              numberOfLines={1}
                            >
                              {lineNames[lineId] ? <><Text style={{ fontWeight: "bold" }}>{lineNames[lineId]}</Text>({lineId})</> : lineId}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Count info */}
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-muted">
            {filteredUpdates.length} 件の更新
            {hasActiveFilter && (
              <Text className="text-muted"> (全{state.updates.length}件)</Text>
            )}
          </Text>
          {state.updates.length > 0 && (
            <TouchableOpacity onPress={handleClearData} activeOpacity={0.7}>
              <Text className="text-sm text-error">クリア</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    ),
    [
      state.connectionStatus,
      state.deviceIds,
      state.lineIds,
      lineNames,
      lineColors,
      state.updates.length,
      searchQuery,
      selectedStates,
      selectedDevices,
      selectedRoutes,
      filteredUpdates.length,
      hasActiveFilter,
      handleClearData,
      handleStateSelect,
      handleDeviceSelect,
      handleRouteSelect,
      handleClearSearch,
      toggleFilter,
      arrowStyle,
      contentStyle,
      colors.muted,
    ]
  );

  const ListEmpty = useMemo(
    () => (
      <View className="flex-1 items-center justify-center py-20">
        <Text style={{ fontSize: 64, lineHeight: 80 }} className="mb-4">📍</Text>
        <Text className="text-lg font-semibold text-foreground mb-2">
          {hasActiveFilter
            ? "条件に一致するデータがありません"
            : "データがありません"}
        </Text>
        <Text className="text-sm text-muted text-center px-8">
          {hasActiveFilter
            ? "フィルター条件を変更してください"
            : "WebSocketに接続して位置情報データを受信してください"}
        </Text>
      </View>
    ),
    [hasActiveFilter]
  );

  return (
    <ScreenContainer>
      <FlatList
        data={filteredUpdates}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
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
