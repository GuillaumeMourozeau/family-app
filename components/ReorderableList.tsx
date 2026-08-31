import { type ReactNode, useEffect, useRef, useState } from "react";
import { Animated, LayoutAnimation, PanResponder, Platform, StyleSheet, UIManager, View } from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

type Props<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderRow: (item: T, isActive: boolean) => ReactNode;
  rowHeight?: number;
  // Fired the instant a row is grabbed / released — use to pause an outer
  // scroll view so it doesn't compete with the drag gesture.
  onReorderStart?: () => void;
  onReorderEnd?: (newOrder: T[]) => void;
};

// A dedicated drag-to-reorder list: every row is grabbable the moment you
// touch it — there's no long-press-to-arm step here, because this component
// is only ever rendered inside a sheet whose sole purpose is reordering.
// The "long press the name to start reordering" gesture lives one level up,
// on the row in the real list, which is what opens that sheet.
export function ReorderableList<T>({ data, keyExtractor, renderRow, rowHeight = 52, onReorderStart, onReorderEnd }: Props<T>) {
  const [order, setOrder] = useState(data);
  const orderRef = useRef(order);
  orderRef.current = order;
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!draggingKey) setOrder(data);
  }, [data, draggingKey]);

  function moveItem(key: string, newIndex: number) {
    setOrder((prev) => {
      const fromIndex = prev.findIndex((o) => keyExtractor(o) === key);
      const clampedIndex = clamp(newIndex, 0, prev.length - 1);
      if (fromIndex === -1 || fromIndex === clampedIndex) return prev;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(clampedIndex, 0, moved);
      return next;
    });
  }

  return (
    <View style={{ height: order.length * rowHeight }}>
      {order.map((item, index) => {
        const key = keyExtractor(item);
        return (
          <ReorderableRow
            key={key}
            item={item}
            index={index}
            rowHeight={rowHeight}
            renderRow={renderRow}
            onGrant={() => {
              setDraggingKey(key);
              onReorderStart?.();
            }}
            onMoveIndex={(newIndex) => moveItem(key, newIndex)}
            onRelease={() => {
              setDraggingKey(null);
              onReorderEnd?.(orderRef.current);
            }}
          />
        );
      })}
    </View>
  );
}

function ReorderableRow<T>({
  item,
  index,
  rowHeight,
  renderRow,
  onGrant,
  onMoveIndex,
  onRelease,
}: {
  item: T;
  index: number;
  rowHeight: number;
  renderRow: (item: T, isActive: boolean) => ReactNode;
  onGrant: () => void;
  onMoveIndex: (newIndex: number) => void;
  onRelease: () => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const [isActive, setIsActive] = useState(false);
  // PanResponder is created once, so its callbacks close over stale props —
  // route every read through a ref that's refreshed on every render instead.
  const indexRef = useRef(index);
  indexRef.current = index;
  const startIndexRef = useRef(index);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startIndexRef.current = indexRef.current;
        translateY.setValue(0);
        setIsActive(true);
        onGrant();
      },
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(gesture.dy);
        const newIndex = Math.round(startIndexRef.current + gesture.dy / rowHeight);
        onMoveIndex(newIndex);
      },
      onPanResponderRelease: () => {
        setIsActive(false);
        translateY.setValue(0);
        onRelease();
      },
      onPanResponderTerminate: () => {
        setIsActive(false);
        translateY.setValue(0);
        onRelease();
      },
    })
  ).current;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.row,
        { height: rowHeight, top: isActive ? startIndexRef.current * rowHeight : index * rowHeight },
        isActive && { transform: [{ translateY }], zIndex: 10, elevation: 4, opacity: 0.96 },
      ]}
    >
      {renderRow(item, isActive)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { position: "absolute", left: 0, right: 0, justifyContent: "center" },
});
