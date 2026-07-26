import { useEffect, useRef } from "react";
import { PanResponder } from "react-native";

const SWIPE_DISTANCE_THRESHOLD = 50;
const SWIPE_ACTIVATION_THRESHOLD = 15;

// Generic horizontal-swipe-to-navigate gesture (e.g. week/month paging).
// Nested inside a screen that also has useSwipeTabs on its outer container —
// this claims the gesture first since it's the deeper view.
export function useSwipeNavigate(onNavigate: (direction: -1 | 1) => void) {
  const onNavigateRef = useRef(onNavigate);
  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > SWIPE_ACTIVATION_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) < SWIPE_DISTANCE_THRESHOLD) return;
        onNavigateRef.current(gesture.dx < 0 ? 1 : -1);
      },
    })
  ).current;

  return panResponder.panHandlers;
}
