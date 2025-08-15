import { ThemedView } from "@/components/ThemedView";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import type { PropsWithChildren, ReactElement } from "react";
import { ScrollView, StyleSheet } from "react-native";

export default function AppScrollView({
  children,
}: PropsWithChildren<object>): ReactElement {
  const bottom = useBottomTabOverflow();

  return (
    <ThemedView style={[styles.container]}>
      <ScrollView
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingBottom: bottom }}
      >
        <ThemedView style={styles.content}>{children}</ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 32,
    overflow: "hidden",
  },
});
