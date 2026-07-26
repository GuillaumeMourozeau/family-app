import { useRef, useState } from "react";
import { State, type PinchGestureHandlerGestureEvent, type PinchGestureHandlerStateChangeEvent } from "react-native-gesture-handler";

// Two-finger pinch drives a numeric "size" value (e.g. pixels per hour on a
// schedule grid), clamped to [min, max]. Scale resets to 1 at the start of
// each pinch, so baseValue tracks where the value was when the last pinch ended.
export function usePinchZoom(initial: number, min: number, max: number) {
  const [value, setValue] = useState(initial);
  const baseValue = useRef(initial);

  function onGestureEvent(event: PinchGestureHandlerGestureEvent) {
    const next = baseValue.current * event.nativeEvent.scale;
    setValue(Math.min(max, Math.max(min, next)));
  }

  function onHandlerStateChange(event: PinchGestureHandlerStateChangeEvent) {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      baseValue.current = value;
    }
  }

  return { value, onGestureEvent, onHandlerStateChange };
}
