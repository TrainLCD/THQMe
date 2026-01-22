import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { ConnectionStatusBadge } from "@/components/connection-status";
import { useLocation } from "@/lib/location-store";

export default function HomeScreen() {
  const { state, connect, disconnect, setWsUrl } = useLocation();
  const [inputUrl, setInputUrl] = useState(state.wsUrl);

  const handleConnect = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (state.connectionStatus === "connected" || state.connectionStatus === "connecting") {
      disconnect();
    } else {
      setWsUrl(inputUrl);
      connect(inputUrl);
    }
  };

  const isConnected = state.connectionStatus === "connected" || state.connectionStatus === "connecting";
  const buttonLabel = isConnected ? "切断" : "接続";

  const formatLastUpdate = () => {
    if (state.updates.length === 0) return "-";
    const lastUpdate = state.updates[0];
    return new Date(lastUpdate.timestamp).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View className="items-center gap-2">
            <Text className="text-3xl font-bold text-foreground">Location Tracker</Text>
            <Text className="text-base text-muted text-center">
              WebSocket経由で位置情報をリアルタイム受信
            </Text>
          </View>

          {/* Connection Status Card */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-foreground">接続ステータス</Text>
              <ConnectionStatusBadge status={state.connectionStatus} />
            </View>

            {/* URL Input */}
            <View className="mb-4">
              <Text className="text-sm text-muted mb-2">WebSocket URL</Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="ws://example.com/location"
                placeholderTextColor="#64748B"
                value={inputUrl}
                onChangeText={setInputUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                editable={!isConnected}
              />
            </View>

            {/* Connect Button */}
            <TouchableOpacity
              className={`py-3 rounded-xl ${isConnected ? "bg-error" : "bg-primary"}`}
              onPress={handleConnect}
              activeOpacity={0.8}
              disabled={!inputUrl.trim() && !isConnected}
              style={!inputUrl.trim() && !isConnected ? styles.disabledButton : undefined}
            >
              <Text className="text-center text-white font-semibold text-base">
                {buttonLabel}
              </Text>
            </TouchableOpacity>

            {/* Error Message */}
            {state.error && (
              <View className="mt-3 p-3 bg-error/10 rounded-lg">
                <Text className="text-error text-sm">{state.error}</Text>
              </View>
            )}
          </View>

          {/* Statistics Card */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-4">統計情報</Text>

            <View className="flex-row justify-between mb-3">
              <View className="flex-1 items-center">
                <Text className="text-3xl font-bold text-primary">
                  {state.deviceIds.length}
                </Text>
                <Text className="text-sm text-muted mt-1">デバイス数</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="flex-1 items-center">
                <Text className="text-3xl font-bold text-primary">
                  {state.messageCount}
                </Text>
                <Text className="text-sm text-muted mt-1">受信メッセージ</Text>
              </View>
            </View>

            <View className="border-t border-border pt-3 mt-3">
              <View className="flex-row justify-between">
                <Text className="text-muted">最終更新</Text>
                <Text className="text-foreground font-medium">{formatLastUpdate()}</Text>
              </View>
            </View>
          </View>

          {/* Device List */}
          {state.deviceIds.length > 0 && (
            <View className="bg-surface rounded-2xl p-5 border border-border">
              <Text className="text-lg font-semibold text-foreground mb-3">
                接続デバイス
              </Text>
              {state.deviceIds.map((deviceId) => (
                <View
                  key={deviceId}
                  className="flex-row items-center py-2 border-b border-border last:border-b-0"
                >
                  <Text className="text-muted mr-2">📱</Text>
                  <Text className="text-foreground flex-1" numberOfLines={1}>
                    {deviceId}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
