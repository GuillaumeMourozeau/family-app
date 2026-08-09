import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  // Rendered below the scrollable content but still inside the sheet, and
  // NOT part of the scroll area — use this for a primary action button so
  // it's always reachable without needing to scroll all the way down
  // (scrolling to the bottom of a tall, dynamically-growing form was
  // unreliable enough to be a real bug people hit).
  footer?: ReactNode;
};

export function BottomSheetModal({ visible, onClose, children, contentStyle, footer }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.content, contentStyle]} onPress={(e) => e.stopPropagation()}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer && <View style={styles.footer}>{footer}</View>}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  content: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: "88%",
  },
  scroll: { flexShrink: 1 },
  scrollContent: { padding: spacing.xl, gap: spacing.sm + 2 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
});
