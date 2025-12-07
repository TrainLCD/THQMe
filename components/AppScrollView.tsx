import { ThemedView } from "@/components/ThemedView";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import { type PropsWithChildren, type ReactElement } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ConditionCard } from "./ConditionCard";
import { ThemedText } from "./ThemedText";

export default function AppScrollView({
  children,
  scoreLabel,
}: PropsWithChildren<{
  scoreLabel: "Good" | "Moderate" | "Poor" | "Unknown";
}>): ReactElement {
  const bottom = useBottomTabOverflow();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingBottom: bottom }}
        stickyHeaderIndices={[0]}
      >
        <ThemedView style={styles.conditionCardContainer} withSafeArea>
          <View style={styles.conditionCardWrapper}>
            <ConditionCard scoreLabel={scoreLabel} />
          </View>
        </ThemedView>
        <ThemedView style={styles.content}>
          <ThemedText type="subtitle" style={styles.headingText}>
            直近のアクティビティ
          </ThemedText>
          {children}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conditionCardWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headingText: {
    marginTop: 32,
  },
  conditionCardContainer: {
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
    flex: 1,
    paddingHorizontal: 32,
    overflow: "hidden",
  },
});
