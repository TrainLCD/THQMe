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
    if (activities.length === 0)
      return { p50: 0, redRatio: 0, yellowRatio: 0, label: "Unknown" as const };

    const byId = new Map<
      string,
      {
        id: string;
        samples: { ts: number; accuracyM?: number; speedKmh?: number }[];
      }
    >();
    for (const a of activities) {
      const entry = byId.get(a.id) ?? { id: a.id, samples: [] };
      entry.samples.push({
        ts: a.timestamp,
        accuracyM: a.coords.accuracy,
        speedKmh: a.coords.speed != null ? a.coords.speed * 3.6 : undefined,
      });
      byId.set(a.id, entry);
    }
    const clients = Array.from(byId.values());
    const nowTs = activities[0]?.timestamp ?? Date.now();
    return calcOverallScore(clients, nowTs);
  }, [activities]);

  return (
    <DashboardScrollView>
      <ThemedView>
        <ConditionCard scoreLabel={overallScore.label} />
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
