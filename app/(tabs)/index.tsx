import { StyleSheet } from "react-native";

import { ActivityList } from "@/components/ActivityList";
import DashboardScrollView from "@/components/AppScrollView";
import { ConditionCard } from "@/components/ConditionCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useListenActivities } from "@/hooks/useListenActivities";
import { calcOverallScore } from "@/utils/scoring";
import { useMemo } from "react";

export default function HomeScreen() {
  const { activities } = useListenActivities();

  const overallScore = useMemo(() => {
    const clients = activities.map((a) => ({
      id: a.id,
      samples: [
        {
          ts: a.timestamp,
          accuracyM: a.coords.accuracy,
          speedKmh: a.coords.speed,
        },
      ],
    }));
    return calcOverallScore(
      clients,
      activities[activities.length - 1]?.timestamp
    );
  }, [activities]);

  return (
    <DashboardScrollView>
      <ThemedView>
        <ConditionCard
          scoreLabel={activities.length ? overallScore.label : "Unknown"}
        />
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
