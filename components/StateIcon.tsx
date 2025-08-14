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
            name="arrow.forward.to.line"
            weight="bold"
            color="white"
            size={24}
          />
        </View>
      );
    case MOVING_STATE.ARRIVED:
      return (
        <View style={styles.container}>
          <IconSymbol
            name="stop.circle"
            weight="bold"
            color="white"
            size={24}
          />
        </View>
      );
    case MOVING_STATE.MOVING:
      return (
        <View style={styles.container}>
          <IconSymbol
            name="arrow.forward"
            weight="bold"
            color="white"
            size={24}
          />
        </View>
      );
    case MOVING_STATE.PASSING:
      return (
        <View style={styles.container}>
          <IconSymbol
            name="arrow.right.circle.dotted"
            weight="bold"
            color="white"
            size={32} // 視認性のために特別32を指定
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
    backgroundColor: "#00AC9A",
    justifyContent: "center",
    alignItems: "center",
  },
});
