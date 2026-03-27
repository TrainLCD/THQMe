import { useState, useRef, useCallback, type ReactNode } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";

const ARROW_SIZE = 6;
const TOOLTIP_OFFSET = 4;

interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ text, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0 });
  const triggerRef = useRef<View>(null);
  const colors = useColors();

  const handleOpen = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setPosition({ x, y: y + height + TOOLTIP_OFFSET + ARROW_SIZE, width });
      setVisible(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <>
      <Pressable
        ref={triggerRef}
        className={cn(className)}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityHint="ツールチップを表示します"
      >
        {children}
      </Pressable>
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={handleClose}>
          <View
            style={[
              styles.tooltip,
              {
                top: position.y,
                right: 16,
                backgroundColor: colors.foreground,
              },
            ]}
          >
            <View
              style={[
                styles.arrow,
                {
                  top: -ARROW_SIZE,
                  right: position.width / 2 - ARROW_SIZE,
                  borderBottomColor: colors.foreground,
                },
              ]}
            />
            <Text style={{ color: colors.background, fontSize: 14 }}>
              {text}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  tooltip: {
    position: "absolute",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  arrow: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
