import { View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  withSafeArea?: boolean;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  withSafeArea = false,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background"
  );
  const { top: safeAreaTop } = useSafeAreaInsets();

  const paddingTop = useMemo(
    () => (withSafeArea ? safeAreaTop : 0),
    [withSafeArea, safeAreaTop]
  );

  return (
    <View style={[{ backgroundColor, paddingTop }, style]} {...otherProps} />
  );
}
