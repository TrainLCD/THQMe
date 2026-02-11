import { useMemo } from "react";
import type { LocationUpdate, MovingState, BatteryState } from "@/lib/types/location";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface LineSegment {
  lineId: string | null;
  coordinates: Coordinate[];
}

export interface DeviceTrajectory {
  deviceId: string;
  coordinates: Coordinate[];
  segments: LineSegment[];
  latestPosition: Coordinate | null;
  latestState: MovingState | null;
  latestSpeed: number | null | undefined;
  latestAccuracy: number | null | undefined;
  latestBatteryLevel: number | null;
  latestBatteryState: BatteryState | number | null;
  latestLineId: string | null;
}

/**
 * 選択されたデバイスの軌跡データを計算するフック
 */
export function useDeviceTrajectory(
  updates: LocationUpdate[],
  selectedDevices: Set<string>
): DeviceTrajectory[] {
  return useMemo(() => {
    if (selectedDevices.size === 0) {
      return [];
    }

    const deviceMap = new Map<string, LocationUpdate[]>();

    // デバイスごとにupdatesをグループ化
    for (const update of updates) {
      if (!selectedDevices.has(update.device)) {
        continue;
      }
      const existing = deviceMap.get(update.device) || [];
      existing.push(update);
      deviceMap.set(update.device, existing);
    }

    // 各デバイスの軌跡を作成
    const trajectories: DeviceTrajectory[] = [];

    for (const [deviceId, deviceUpdates] of deviceMap) {
      // timestampでソート（古い順）
      const sorted = [...deviceUpdates].sort((a, b) => a.timestamp - b.timestamp);

      const coordinates: Coordinate[] = sorted.map((u) => ({
        latitude: u.coords.latitude,
        longitude: u.coords.longitude,
      }));

      // 路線ごとにセグメントを分割（連続する同一路線をまとめる）
      const segments: LineSegment[] = [];
      for (const update of sorted) {
        const coord: Coordinate = {
          latitude: update.coords.latitude,
          longitude: update.coords.longitude,
        };
        const current = segments[segments.length - 1];
        if (current && current.lineId === update.line_id) {
          current.coordinates.push(coord);
        } else {
          // 前セグメントの末尾座標を引き継いで接続を維持
          const initial = current?.coordinates.length
            ? [current.coordinates[current.coordinates.length - 1], coord]
            : [coord];
          segments.push({ lineId: update.line_id, coordinates: initial });
        }
      }

      const latestUpdate = sorted.length > 0 ? sorted[sorted.length - 1] : null;
      const latestPosition =
        coordinates.length > 0 ? coordinates[coordinates.length - 1] : null;
      const latestState = latestUpdate?.state ?? null;

      trajectories.push({
        deviceId,
        coordinates,
        segments,
        latestPosition,
        latestState,
        latestSpeed: latestUpdate?.coords.speed ?? null,
        latestAccuracy: latestUpdate?.coords.accuracy ?? null,
        latestBatteryLevel: latestUpdate?.battery_level ?? null,
        latestBatteryState: latestUpdate?.battery_state ?? null,
        latestLineId: latestUpdate?.line_id ?? null,
      });
    }

    return trajectories;
  }, [updates, selectedDevices]);
}

/**
 * 全ての座標を含む領域を計算
 */
export function getAllCoordinates(trajectories: DeviceTrajectory[]): Coordinate[] {
  return trajectories.flatMap((t) => t.coordinates);
}
