import { useMemo, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { LogCard } from "@/components/log-card";
import { ConnectionStatusBadge } from "@/components/connection-status";
import { useLocation } from "@/lib/location-store";
import type { LogData } from "@/lib/types/location";

export default function LogsScreen() {
  const { state, clearUpdates } = useLocation();

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

        {/* Count info */}
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-muted">
            {state.logs.length} 件のログ
          </Text>
          {state.logs.length > 0 && (
            <TouchableOpacity onPress={handleClearData} activeOpacity={0.7}>
              <Text className="text-sm text-error">クリア</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    ),
    [state.connectionStatus, state.logs.length, handleClearData]
  );

  const ListEmpty = useMemo(
    () => (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-6xl mb-4">📝</Text>
        <Text className="text-lg font-semibold text-foreground mb-2">
          ログがありません
        </Text>
        <Text className="text-sm text-muted text-center px-8">
          WebSocketに接続してログデータを受信してください
        </Text>
      </View>
    ),
    []
  );

  return (
    <ScreenContainer>
      <FlatList
        data={state.logs}
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
});
