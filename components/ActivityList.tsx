import { LocationUpdateData } from "@/domain/received";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { ActivityCell } from "./ActivityCell";
import { ThemedView } from "./ThemedView";

type Props = {
  style?: StyleProp<ViewStyle>;
  data: LocationUpdateData[];
};

export function ActivityList({ data, style }: Props) {
  return (
    <ThemedView style={[style, styles.container]}>
      {data.map((item) => (
        <ActivityCell key={item.id} item={item} />
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { gap: 16 } });
