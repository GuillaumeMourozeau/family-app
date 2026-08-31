import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

// Module-level cache of the latest known connectivity, kept in sync by a
// single NetInfo subscription (started the first time anything asks for
// status) so non-component code (the mutation queue, cache writers) can
// check connectivity synchronously without needing to be a hook.
let isOnlineNow = true;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<(online: boolean) => void>();

function ensureSubscribed() {
  if (unsubscribe) return;
  unsubscribe = NetInfo.addEventListener((state) => {
    // isInternetReachable is null while NetInfo is still figuring it out —
    // fall back to isConnected in that case rather than treating it as offline.
    const online = state.isInternetReachable ?? state.isConnected ?? true;
    if (online === isOnlineNow) return;
    isOnlineNow = online;
    for (const listener of listeners) listener(online);
  });
}

export function isOnline(): boolean {
  ensureSubscribed();
  return isOnlineNow;
}

export function onConnectivityChange(listener: (online: boolean) => void): () => void {
  ensureSubscribed();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(isOnline);
  useEffect(() => onConnectivityChange(setOnline), []);
  return online;
}
