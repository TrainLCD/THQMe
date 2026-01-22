import { useState, useMemo, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { LocationCard } from "@/components/location-card";
import { ConnectionStatusBadge } from "@/components/connection-status";
import { useLocation } from "@/lib/location-store";
import type { LocationUpdate } from "@/lib/types/location";
import { cn } from "@/lib/utils";

export default function TimelineScreen() {
  const { state, clearUpdates } = useLocation();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter updates by selected device
  const filteredUpdates = useMemo(() => {
    if (!selectedDevice) return state.updates;
    return state.updates.filter((update) => update.device === selectedDevice);
  }, [state.updates, selectedDevice]);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    handleClearData();
    setRefreshing(false);
  }, [handleClearData]);

  const handleDeviceSelect = (device: string | null) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDevice(device);
  };

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

        {/* Device Filter */}
        {state.deviceIds.length > 0 && (
          <View className="mb-4">
            <Text className="text-sm text-muted mb-2">デバイスフィルター</Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                onPress={() => handleDeviceSelect(null)}
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
            </View>
          </View>
        )}

        {/* Count info */}
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-muted">
            {filteredUpdates.length} 件の更新
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
      state.updates.length,
      selectedDevice,
      filteredUpdates.length,
      handleClearData,
    ]
  );

  const ListEmpty = useMemo(
    () => (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-6xl mb-4">📍</Text>
        <Text className="text-lg font-semibold text-foreground mb-2">
          データがありません
        </Text>
        <Text className="text-sm text-muted text-center px-8">
          WebSocketに接続して位置情報データを受信してください
        </Text>
      </View>
    ),
    []
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  filterButton: {
    marginBottom: 4,
  },
});
