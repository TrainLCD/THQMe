import { LinearGradient } from "expo-linear-gradient";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "./ui/IconSymbol";

type Props = {
  scoreLabel: "Good" | "Moderate" | "Poor" | "Unknown";
};

const JAPANESE_SCORE_LABEL = {
  Good: "良好",
  Moderate: "要注意",
  Poor: "支障あり",
  Unknown: "不明",
} as const;

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
      <ImageBackground
        source={require("../assets/images/halftone.png")}
        imageStyle={{
          height: "100%",
          marginTop: "25%",
        }}
        resizeMode="repeat"
      >
        <View style={styles.content}>
          <IconSymbol name={icons[scoreLabel]} color="white" size={64} />
          <View style={styles.labels}>
            <Text style={styles.overallScoreLabel}>コンディション</Text>
            <Text style={styles.scoreLabel}>
              {JAPANESE_SCORE_LABEL[scoreLabel]}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 128,
    borderRadius: 16,
    shadowColor: "black",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 32,
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
