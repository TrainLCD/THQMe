import { ReceivedData } from "@/domain/received";
import { MOVING_STATE } from "@/domain/state";
import dayjs from "dayjs";
import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { StateIcon } from "./StateIcon";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { IconSymbol } from "./ui/IconSymbol";

type Props = {
  item: ReceivedData;
};

export function ActivityCell({ item }: Props) {
  const stateText = useMemo(() => {
    switch (item.state) {
      case MOVING_STATE.ARRIVED:
        return "Arrived";
      case MOVING_STATE.APPROACHING:
        return "Approaching";
      case MOVING_STATE.MOVING:
        return "Running";
      case MOVING_STATE.PASSING:
        return "Passing";
      default:
        return "Unknown";
    }
  }, [item.state]);

  const formedDate = useMemo(() => {
    return dayjs(item.timestamp).format("MM/DD HH:mm:ss");
  }, [item.timestamp]);

  const accuracyStyle = useMemo(() => {
    if (item.accuracy) {
      if (item.accuracy < 20) {
        return styles.good;
      }
      if (item.accuracy < 50) {
        return styles.moderate;
      }
      return styles.poor;
    }
    return styles.poor;
  }, [item.accuracy]);

  const accuracyText = useMemo(() => {
    if (item.accuracy) {
      if (item.accuracy <= 12) {
        return "High Accuracy";
      }
      if (item.accuracy <= 35) {
        return "Moderate Accuracy";
      }
      return "Low Accuracy";
    }
    return "Low Accuracy";
  }, [item.accuracy]);

  const scoreIconName = useMemo(() => {
    if (item.accuracy) {
      if (item.accuracy <= 12) {
        return "checkmark.circle.fill";
      }
      if (item.accuracy <= 35) {
        return "minus.circle.fill";
      }
      return "xmark.circle.fill";
    }
    return "xmark.circle.fill";
  }, [item.accuracy]);

  return (
    <ThemedView key={item.id} style={styles.item}>
      <StateIcon state={item.state} />
      <ThemedView style={styles.details}>
        <ThemedText style={styles.semibold}>
          {formedDate} <ThemedText style={styles.bold}>{stateText}</ThemedText>
        </ThemedText>
        <ThemedText style={styles.leading}>
          {item.speed?.toFixed(1) ?? "-"}
          <ThemedText style={styles.bold}>km/h</ThemedText>
        </ThemedText>
        <ThemedText style={[styles.bold, styles.accuracy, accuracyStyle]}>
          {accuracyText}{" "}
          <ThemedText style={styles.semibold}>
            ±{item.accuracy?.toFixed(0) ?? "-"}m
          </ThemedText>
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.conditionContainer}>
        <IconSymbol
          name={scoreIconName}
          color={accuracyStyle.color}
          size={48}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row" },
  semibold: { fontWeight: "600" },
  bold: { fontWeight: "bold" },
  details: { marginLeft: 8 },
  leading: { fontWeight: "bold", fontSize: 24 },
  accuracy: { fontSize: 12, lineHeight: 16 },
  good: { color: "#34C759" },
  moderate: { color: "#FF9500" },
  poor: { color: "#FF3B30" },
  conditionContainer: {
    marginLeft: "auto",
    justifyContent: "center",
    alignItems: "center",
  },
});
