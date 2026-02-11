import { useState, useCallback, useRef, useEffect, useMemo, Fragment } from "react";
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
import { stateConfig, defaultStateConfig, formatSpeed, formatAccuracy, formatBatteryLevel } from "@/components/location-card";
import { useLocation } from "@/lib/location-store";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import {
  useDeviceTrajectory,
  getAllCoordinates,
} from "@/hooks/use-device-trajectory";
import { getDeviceColor } from "@/constants/map-colors";
import type { MovingState } from "@/lib/types/location";
import { useLineNames } from "@/hooks/use-line-names";

// react-native-maps は Web では使えないので条件付きインポート
let MapView: typeof import("react-native-maps").default | null = null;
let Polyline: typeof import("react-native-maps").Polyline | null = null;
let Marker: typeof import("react-native-maps").Marker | null = null;
let Callout: typeof import("react-native-maps").Callout | null = null;

if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Polyline = Maps.Polyline;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
}

type MapViewRef = import("react-native-maps").default;
type MapMarkerRef = { showCallout: () => void; hideCallout: () => void };

// アコーディオンコンテンツの最大高さ（アニメーション用）
const ACCORDION_MAX_HEIGHT_BASE = 100;
const ACCORDION_MAX_HEIGHT_WITH_ROUTES = 200;

export default function MapScreen() {
  const { state } = useLocation();
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const lineNames = useLineNames(state.lineIds);
  const mapRef = useRef<MapViewRef | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const selectedMarkerIdRef = useRef<string | null>(null);
  const markerRefs = useRef<Map<string, MapMarkerRef>>(new Map());

  // フィルター項目数に応じて最大高さを調整
  const maxAccordionHeight = state.lineIds.length > 0
    ? ACCORDION_MAX_HEIGHT_WITH_ROUTES
    : ACCORDION_MAX_HEIGHT_BASE;

  // アニメーション用の共有値（開いた状態で初期化）
  const rotateValue = useSharedValue(180);
  const maxHeightValue = useSharedValue(maxAccordionHeight);
  const opacityValue = useSharedValue(1);

  const colors = useColors();

  // 路線IDでフィルタリングされたupdates
  const filteredUpdates = useMemo(() => {
    if (selectedRoutes.size === 0) return state.updates;
    return state.updates.filter(
      (update) => update.line_id && selectedRoutes.has(update.line_id)
    );
  }, [state.updates, selectedRoutes]);

  // 軌跡データを計算
  const trajectories = useDeviceTrajectory(filteredUpdates, selectedDevices);

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

  // 追従モード時のみカメラ調整
  useEffect(() => {
    if (Platform.OS === "web" || !mapRef.current || !isFollowing) return;

    const allCoords = getAllCoordinates(trajectories);
    if (allCoords.length === 0) return;

    mapRef.current.fitToCoordinates(allCoords, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  }, [trajectories, isFollowing]);

  // ユーザーが手動で地図を操作したら追従を解除
  const handleMapPanDrag = useCallback(() => {
    setIsFollowing(false);
  }, []);

  // マーカーをタップしたら選択状態にする
  const handleMarkerPress = useCallback((deviceId: string) => {
    selectedMarkerIdRef.current = deviceId;
  }, []);

  // マップ背景をタップしたら吹き出しを明示的に閉じる
  const handleMapPress = useCallback(() => {
    if (selectedMarkerIdRef.current) {
      const marker = markerRefs.current.get(selectedMarkerIdRef.current);
      if (marker) {
        marker.hideCallout();
      }
    }
    selectedMarkerIdRef.current = null;
  }, []);

  // 吹き出しをタップしたら閉じる
  const handleCalloutPress = useCallback((deviceId: string) => {
    selectedMarkerIdRef.current = null;
    const marker = markerRefs.current.get(deviceId);
    if (marker) {
      marker.hideCallout();
    }
  }, []);

  // 地図の移動完了後に選択中のマーカーの吹き出しを再表示する
  const handleRegionChangeComplete = useCallback(() => {
    const markerId = selectedMarkerIdRef.current;
    if (markerId) {
      const marker = markerRefs.current.get(markerId);
      if (marker) {
        marker.showCallout();
      }
    }
  }, []);

  // 現在地に戻るボタン
  const handleReturnToCurrentLocation = useCallback(() => {
    if (!mapRef.current) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsFollowing(true);

    const allCoords = getAllCoordinates(trajectories);
    if (allCoords.length === 0) return;

    mapRef.current.fitToCoordinates(allCoords, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  }, [trajectories]);

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
    maxHeightValue.value = withTiming(newValue ? maxAccordionHeight : 0, animConfig);
    opacityValue.value = withTiming(newValue ? 1 : 0, { duration: newValue ? 250 : 150 });
  }, [isFilterExpanded, rotateValue, maxHeightValue, opacityValue, maxAccordionHeight]);

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
                {(selectedDevices.size > 0 || selectedRoutes.size > 0) && (
                  <View className="ml-2 bg-primary px-2 py-0.5 rounded-full">
                    <Text className="text-xs text-white font-medium">
                      適用中
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
              {/* Device Filter */}
              <View className="mt-3">
                <Text className="text-sm text-muted mb-2">デバイス</Text>
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
                    {state.lineIds.map((lineId) => (
                      <TouchableOpacity
                        key={lineId}
                        onPress={() => handleRouteSelect(lineId)}
                        activeOpacity={0.7}
                        style={styles.filterButton}
                      >
                        <View
                          className={cn(
                            "px-3 py-2 rounded-full border",
                            selectedRoutes.has(lineId)
                              ? "bg-primary border-primary"
                              : "bg-background border-border"
                          )}
                        >
                          <Text
                            className={cn(
                              "text-sm font-medium",
                              selectedRoutes.has(lineId) ? "text-white" : "text-foreground"
                            )}
                            numberOfLines={1}
                          >
                            {lineNames[lineId] ? <><Text style={{ fontWeight: "bold" }}>{lineNames[lineId]}</Text>({lineId})</> : lineId}
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
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: 35.6812,
                  longitude: 139.7671,
                  latitudeDelta: 0.5,
                  longitudeDelta: 0.5,
                }}
                onPanDrag={handleMapPanDrag}
                onRegionChangeComplete={handleRegionChangeComplete}
                onPress={handleMapPress}
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
                    {Marker && trajectory.latestPosition && (() => {
                      const stateConf = trajectory.latestState
                        ? stateConfig[trajectory.latestState as MovingState] || defaultStateConfig
                        : defaultStateConfig;
                      const stateLabel = stateConf.label === "不明" && trajectory.latestState
                        ? String(trajectory.latestState)
                        : stateConf.label;
                      const borderColor = colors[stateConf.colorKey];

                      return (
                        <Marker
                          ref={(ref) => {
                            if (ref) {
                              markerRefs.current.set(trajectory.deviceId, ref);
                            } else {
                              markerRefs.current.delete(trajectory.deviceId);
                            }
                          }}
                          coordinate={trajectory.latestPosition}
                          pinColor={getDeviceColor(trajectory.deviceId, state.deviceIds)}
                          stopPropagation
                          onPress={() => handleMarkerPress(trajectory.deviceId)}
                          onCalloutPress={() => handleCalloutPress(trajectory.deviceId)}
                        >
                          {Callout && (
                            <Callout tooltip={false}>
                              <View style={styles.calloutContainer}>
                                <View style={styles.calloutHeader}>
                                  <Text style={styles.calloutTitle}>{trajectory.deviceId}</Text>
                                  <View
                                    className={cn("px-2 py-0.5 rounded-full", stateConf.bgClass)}
                                    style={{ borderWidth: 1, borderColor }}
                                  >
                                    <Text className={cn("text-xs font-medium", stateConf.textClass)}>
                                      {stateLabel}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={styles.calloutDescription}>最新位置</Text>
                                {trajectory.latestLineId && lineNames[trajectory.latestLineId] && (
                                  <Text style={styles.calloutLineName}>🚆 {lineNames[trajectory.latestLineId]}</Text>
                                )}
                                <View style={styles.calloutMetrics}>
                                  <Text style={styles.calloutMetricText}>🏎️ {formatSpeed(trajectory.latestSpeed)}</Text>
                                  <Text style={styles.calloutMetricText}>🎯 {formatAccuracy(trajectory.latestAccuracy)}</Text>
                                  <Text style={styles.calloutMetricText}>🔋 {trajectory.latestBatteryLevel != null ? formatBatteryLevel(trajectory.latestBatteryLevel) : "-"}</Text>
                                </View>
                              </View>
                            </Callout>
                          )}
                        </Marker>
                      );
                    })()}
                  </Fragment>
                ))}
              </MapView>
              {!isFollowing && (
                <TouchableOpacity
                  style={styles.returnButton}
                  onPress={handleReturnToCurrentLocation}
                  activeOpacity={0.8}
                >
                  <Text style={styles.returnButtonText}>現在地に戻る</Text>
                </TouchableOpacity>
              )}
            </View>
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
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  returnButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  returnButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  calloutContainer: {
    minWidth: 140,
    padding: 8,
  },
  calloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  calloutDescription: {
    fontSize: 12,
    color: "#687076",
    marginTop: 4,
    marginBottom: 4,
  },
  calloutLineName: {
    fontSize: 12,
    color: "#687076",
    marginTop: 2,
  },
  calloutMetrics: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  calloutMetricText: {
    fontSize: 11,
    color: "#687076",
  },
});
