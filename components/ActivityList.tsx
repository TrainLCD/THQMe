import { ReceivedData } from "@/domain/received";
import { MOVING_STATE } from "@/domain/state";
import dayjs from "dayjs";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { ActivityCell } from "./ActivityCell";
import { ThemedView } from "./ThemedView";

const data: ReceivedData[] = [
  {
    id: "1",
    lat: 37.7749,
    lon: -122.4194,
    accuracy: 10,
    speed: 71.55,
    timestamp: dayjs("2025/8/13 11:47:42").toDate().getTime(),
    state: MOVING_STATE.MOVING,
    device: "device1",
  },
  {
    id: "2",
    lat: 37.7749,
    lon: -122.4194,
    accuracy: 30,
    speed: 0.0,
    timestamp: dayjs("2025/8/13 11:43:57").toDate().getTime(),
    state: MOVING_STATE.ARRIVED,
    device: "device1",
  },
  {
    id: "3",
    lat: 37.7749,
    lon: -122.4194,
    accuracy: 96,
    speed: 0.0,
    timestamp: dayjs("2025/8/13 11:47:42").toDate().getTime(),
    state: MOVING_STATE.PASSING,
    device: "device1",
  },
] as const;

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function ActivityList({ style }: Props) {
  return (
    <ThemedView style={[style, styles.container]}>
      {data.map((item) => (
        <ActivityCell key={item.id} item={item} />
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { gap: 16 } });
