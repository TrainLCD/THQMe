import { MOVING_STATE, MovingState } from "@/domain/state";
import { StyleSheet, View } from "react-native";
import { IconSymbol } from "./ui/IconSymbol";

type Props = {
  state: MovingState;
};

export function StateIcon({ state }: Props) {
  switch (state) {
    case MOVING_STATE.APPROACHING:
      return (
        <View style={styles.container}>
          <IconSymbol
            name="chevron.right.to.line"
            weight="bold"
            color="#525252"
            size={21}
          />
        </View>
      );
    case MOVING_STATE.ARRIVED:
      return (
        <View style={styles.container}>
          <IconSymbol
            name="stop.fill"
            weight="bold"
            color="#525252"
            size={21}
          />
        </View>
      );
    case MOVING_STATE.MOVING:
      return (
        <View style={styles.container}>
          <IconSymbol
            name="chevron.right"
            weight="bold"
            color="#525252"
            size={21}
          />
        </View>
      );
    case MOVING_STATE.PASSING:
      return (
        <View style={styles.container}>
          <IconSymbol
            name={`chevron.right.dotted.chevron.right`}
            weight="bold"
            color="#525252"
            size={21}
          />
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderColor: "#525252",
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
