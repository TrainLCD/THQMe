import { LocationUpdateData } from "@/domain/received";
import { MOVING_STATE } from "@/domain/state";
import { LocationTriageKind } from "@/domain/triage";
import dayjs from "dayjs";
import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { StateIcon } from "./StateIcon";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { IconSymbol } from "./ui/IconSymbol";

type Props = {
  item: LocationUpdateData;
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

  const accuracyKind = useMemo<LocationTriageKind | null>(() => {
    const accuracy = item.coords.accuracy;
    if (accuracy == null || Number.isNaN(accuracy)) {
      return null;
    }
    if (accuracy <= 12) {
      return "high";
    }
    if (accuracy <= 35) {
      return "moderate";
    }
    return "low";
  }, [item.coords.accuracy]);

  const accuracyStyle = useMemo(() => {
    switch (accuracyKind) {
      case "high":
        return styles.good;
      case "moderate":
        return styles.moderate;
      case "low":
        return styles.poor;
      default:
        return null;
    }
  }, [accuracyKind]);

  const accuracyText = useMemo(() => {
    switch (accuracyKind) {
      case "high":
        return "High Accuracy";
      case "moderate":
        return "Moderate Accuracy";
      case "low":
        return "Low Accuracy";
      default:
        return null;
    }
  }, [accuracyKind]);

  const scoreIconName = useMemo(() => {
    switch (accuracyKind) {
      case "high":
        return "checkmark.circle.fill";
      case "moderate":
        return "minus.circle.fill";
      case "low":
        return "xmark.circle.fill";
      default:
        return null;
    }
  }, [accuracyKind]);

  const speedKMH = useMemo(() => {
    const s = item.coords.speed;
    if (s == null || Number.isNaN(s)) return null;
    return s * 3.6;
  }, [item.coords.speed]);

  return (
    <ThemedView key={item.id} style={styles.item}>
      <StateIcon state={item.state} />
      <ThemedView style={styles.details}>
        <ThemedText style={styles.semibold}>
          {formedDate} <ThemedText style={styles.bold}>{stateText}</ThemedText>
        </ThemedText>
        <ThemedText style={styles.leading}>
          {speedKMH !== null ? speedKMH.toFixed(1) : "-"}
          <ThemedText style={styles.bold}>km/h</ThemedText>
        </ThemedText>
        <ThemedText style={[styles.bold, styles.accuracy, accuracyStyle]}>
          <ThemedText style={styles.semibold}>
            {item.coords.accuracy != null && !Number.isNaN(item.coords.accuracy)
              ? `±${item.coords.accuracy.toFixed(0)}m`
              : "-"}
          </ThemedText>{" "}
          {accuracyText}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.conditionContainer}>
        {scoreIconName && accuracyStyle && (
          <IconSymbol
            name={scoreIconName}
            color={StyleSheet.flatten(accuracyStyle)?.color as string}
            size={48}
          />
        )}
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
