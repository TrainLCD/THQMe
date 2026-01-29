import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  Easing,
} from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { ConnectionStatusBadge } from "@/components/connection-status";
import { useLocation } from "@/lib/location-store";
import { cn } from "@/lib/utils";
import {
  useDeviceTrajectory,
  getAllCoordinates,
} from "@/hooks/use-device-trajectory";
import { getDeviceColor } from "@/constants/map-colors";

// react-native-maps は Web では使えないので条件付きインポート
let MapView: typeof import("react-native-maps").default | null = null;
let Polyline: typeof import("react-native-maps").Polyline | null = null;
let Marker: typeof import("react-native-maps").Marker | null = null;

if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Polyline = Maps.Polyline;
  Marker = Maps.Marker;
}

type MapViewRef = import("react-native-maps").default;

// アコーディオンコンテンツの最大高さ（アニメーション用）
const ACCORDION_MAX_HEIGHT = 200;

export default function MapScreen() {
  const { state } = useLocation();
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const mapRef = useRef<MapViewRef | null>(null);

  // アニメーション用の共有値（開いた状態で初期化）
  const rotateValue = useSharedValue(180);
  const maxHeightValue = useSharedValue(ACCORDION_MAX_HEIGHT);
  const opacityValue = useSharedValue(1);

  // 軌跡データを計算
  const trajectories = useDeviceTrajectory(state.updates, selectedDevices);

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

  // デバイス選択が変わったらカメラ調整
  useEffect(() => {
    if (Platform.OS === "web" || !mapRef.current) return;

    const allCoords = getAllCoordinates(trajectories);
    if (allCoords.length === 0) return;

    mapRef.current.fitToCoordinates(allCoords, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  }, [trajectories]);

  // デバイスフィルターの選択/解除
  const handleDeviceSelect = useCallback((value: string | null) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (value === null) {
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
    maxHeightValue.value = withTiming(newValue ? ACCORDION_MAX_HEIGHT : 0, animConfig);
    opacityValue.value = withTiming(newValue ? 1 : 0, { duration: newValue ? 250 : 150 });
  }, [isFilterExpanded, rotateValue, maxHeightValue, opacityValue]);

  // Web用のフォールバック
  if (Platform.OS === "web") {
    return (
      <ScreenContainer>
        <View className="flex-1 p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-foreground">マップ</Text>
            <ConnectionStatusBadge status={state.connectionStatus} />
          </View>
          <View className="flex-1 items-center justify-center">
            <Text style={{ fontSize: 80, marginBottom: 24 }}>🗺️</Text>
            <Text className="text-2xl font-bold text-foreground mb-3">Web未対応</Text>
            <Text className="text-base text-muted text-center">
              マップ機能はiOS/Androidアプリでのみ利用可能です
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-1 p-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-foreground">マップ</Text>
          <ConnectionStatusBadge status={state.connectionStatus} />
        </View>

        {/* Device Filter Accordion */}
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
                  デバイス
                </Text>
                {selectedDevices.size > 0 && (
                  <View className="ml-2 bg-primary px-2 py-0.5 rounded-full">
                    <Text className="text-xs text-white font-medium">
                      {selectedDevices.size}件選択中
                    </Text>
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
              <View className="mt-3">
                {state.deviceIds.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                  >
                    {/* 選択解除ボタン */}
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
                          選択解除
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {state.deviceIds.map((device) => {
                      const deviceColor = getDeviceColor(device, state.deviceIds);
                      const isSelected = selectedDevices.has(device);
                      return (
                        <TouchableOpacity
                          key={device}
                          onPress={() => handleDeviceSelect(device)}
                          activeOpacity={0.7}
                          style={styles.filterButton}
                        >
                          <View
                            className="px-3 py-2 rounded-full"
                            style={{
                              backgroundColor: isSelected ? deviceColor : "transparent",
                              borderWidth: 1,
                              borderColor: deviceColor,
                            }}
                          >
                            <Text
                              className="text-sm font-medium"
                              style={{
                                color: isSelected ? "#FFFFFF" : deviceColor,
                              }}
                            >
                              {device}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text className="text-sm text-muted">デバイスがありません</Text>
                )}
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Map View */}
        <View className="flex-1 rounded-xl overflow-hidden bg-muted/20">
          {selectedDevices.size === 0 ? (
            <View className="flex-1 items-center justify-center p-5">
              <Text style={{ fontSize: 64, marginBottom: 16 }}>📍</Text>
              <Text className="text-lg font-semibold text-foreground mb-2">
                デバイスを選択してください
              </Text>
              <Text className="text-sm text-muted text-center">
                上のフィルターからデバイスを選択すると軌跡が表示されます
              </Text>
            </View>
          ) : MapView ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: 35.6812,
                longitude: 139.7671,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
              }}
            >
              {trajectories.map((trajectory) => (
                <Fragment key={trajectory.deviceId}>
                  {Polyline && trajectory.coordinates.length > 1 && (
                    <Polyline
                      coordinates={trajectory.coordinates}
                      strokeColor={getDeviceColor(trajectory.deviceId, state.deviceIds)}
                      strokeWidth={4}
                    />
                  )}
                  {Marker && trajectory.latestPosition && (
                    <Marker
                      coordinate={trajectory.latestPosition}
                      title={trajectory.deviceId}
                      description="最新位置"
                      pinColor={getDeviceColor(trajectory.deviceId, state.deviceIds)}
                    />
                  )}
                </Fragment>
              ))}
            </MapView>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  accordionHeader: {
    minHeight: 48,
    justifyContent: "center",
  },
  arrowIcon: {
    fontSize: 12,
    color: "#687076",
  },
  filterScrollContent: {
    gap: 8,
  },
  filterButton: {
    flexShrink: 0,
    marginBottom: 4,
  },
  map: {
    flex: 1,
  },
});
