import { StyleSheet } from "react-native";

import { ActivityList } from "@/components/ActivityList";
import DashboardScrollView from "@/components/AppScrollView";
import { ConditionCard } from "@/components/ConditionCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useListenActivities } from "@/hooks/useListenActivities";

export default function HomeScreen() {
  const { activities } = useListenActivities();

  return (
    <DashboardScrollView>
      <ThemedView>
        <ConditionCard />
        <ThemedView style={styles.space}>
          <ThemedText style={styles.headingText}>Latest activities</ThemedText>
          <ActivityList data={activities} style={styles.activityList} />
        </ThemedView>
      </ThemedView>
    </DashboardScrollView>
  );
}

const styles = StyleSheet.create({
  space: {
    paddingVertical: 16,
  },
  headingText: {
    marginTop: 16,
    fontSize: 21,
    fontWeight: "600",
    color: "#333",
  },
  activityList: {
    marginTop: 16,
  },
});
