import { ActivityList } from "@/components/ActivityList";
import AppScrollView from "@/components/AppScrollView";
import { useListenActivities } from "@/hooks/useListenActivities";
import { calcOverallScore } from "@/utils/scoring";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

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
        accuracyM: a.coords.accuracy ?? undefined,
        speedKmh:
          a.coords.speed === -1
            ? undefined
            : a.coords.speed != null
            ? a.coords.speed * 3.6
            : undefined,
      });
      byId.set(a.id, entry);
    }
    const clients = Array.from(byId.values());
    const nowTs = Date.now();
    return calcOverallScore(clients, nowTs, 0.15);
  }, [activities]);

  return (
    <AppScrollView scoreLabel={overallScore.label}>
      <ActivityList data={activities} style={styles.activityList} />
    </AppScrollView>
  );
}

const styles = StyleSheet.create({
  activityList: {
    marginTop: 16,
  },
});
