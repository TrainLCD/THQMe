import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { DotsOverlay } from "./DotsOverlay";
import { IconSymbol } from "./ui/IconSymbol";

type Props = {
  scoreLabel: "Good" | "Moderate" | "Poor" | "Unknown";
};

export function ConditionCard({ scoreLabel }: Props) {
  const colors = {
    Good: ["#34C759", "#386641"],
    Moderate: ["#FFCC00", "#7A7A00"],
    Poor: ["#FF3B30", "#BF2C2C"],
    Unknown: ["#A9A9A9", "#7D7D7D"],
  } as const;
  const icons = {
    Good: "checkmark.circle.fill",
    Moderate: "minus.circle.fill",
    Poor: "xmark.circle.fill",
    Unknown: "questionmark.circle.fill",
  } as const;

  return (
    <LinearGradient colors={colors[scoreLabel]} style={styles.container}>
      <DotsOverlay style={styles.dotsOverlay} />
      <View style={styles.content}>
        <IconSymbol name={icons[scoreLabel]} color="white" size={64} />
        <View style={styles.labels}>
          <Text style={styles.overallScoreLabel}>Overall condition score</Text>
          <Text style={styles.scoreLabel}>{scoreLabel}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    height: "100%",
    maxHeight: 200,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 64,
    shadowColor: "black",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  dotsOverlay: {
    position: "absolute",
    left: 0,
    top: "-100%",
    width: "100%",
    height: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  labels: {
    marginLeft: 8,
  },
  overallScoreLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  scoreLabel: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
  },
});
