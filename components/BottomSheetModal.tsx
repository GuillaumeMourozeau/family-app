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
  // Turn off while a child (e.g. a drag-to-reorder list) is handling its
  // own pan gesture, so the outer ScrollView doesn't compete with it for
  // the touch responder.
  scrollEnabled?: boolean;
};

export function BottomSheetModal({ visible, onClose, children, contentStyle, footer, scrollEnabled = true }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/*
          The backdrop and the sheet are siblings, not nested — the sheet
          renders on top and naturally absorbs its own touches, so closing
          on backdrop-tap doesn't need a content-side Pressable+stopPropagation
          wrapping the ScrollView. A Pressable ancestor around a ScrollView
          fights the scroll gesture for the responder, which made scrolling
          inside the sheet feel sticky/unsmooth.
        */}
        <Pressable testID="bottomSheetBackdrop" style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} />
        <View style={[styles.content, contentStyle]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
          >
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.4)" },
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
