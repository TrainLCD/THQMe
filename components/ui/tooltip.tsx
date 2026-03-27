import { useState, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { cn } from "@/lib/utils";

interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ text, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Pressable className={cn(className)} onPress={() => setVisible((v) => !v)}>
      {children}
      {visible && (
        <View
          className="absolute top-full mt-1 right-0 bg-foreground rounded-lg px-3 py-1.5 z-50"
          style={{ elevation: 4 }}
        >
          <Text className="text-background text-sm">{text}</Text>
          <View className="absolute -top-1.5 right-3 w-3 h-3 bg-foreground rotate-45" />
        </View>
      )}
    </Pressable>
  );
}
