import { useMemo } from "react";
import type { LocationUpdate, MovingState } from "@/lib/types/location";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface DeviceTrajectory {
  deviceId: string;
  coordinates: Coordinate[];
  latestPosition: Coordinate | null;
  latestState: MovingState | null;
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

      const latestPosition =
        coordinates.length > 0 ? coordinates[coordinates.length - 1] : null;
      const latestState =
        sorted.length > 0 ? sorted[sorted.length - 1].state : null;

      trajectories.push({
        deviceId,
        coordinates,
        latestPosition,
        latestState,
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
