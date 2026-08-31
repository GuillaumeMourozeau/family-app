import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isOnline, onConnectivityChange } from "@/lib/offline/network";

export type QueuedMutation = { id: string; kind: string; payload: unknown; createdAt: number };
type Handler = (payload: unknown) => Promise<void>;

const QUEUE_STORAGE_KEY = "offlineMutationQueue";

let queue: QueuedMutation[] = [];
let isLoaded = false;
let loadPromise: Promise<void> | null = null;
const queueListeners = new Set<(count: number) => void>();

async function ensureLoaded() {
  if (isLoaded) return;
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(QUEUE_STORAGE_KEY).then((raw) => {
      queue = raw ? JSON.parse(raw) : [];
      isLoaded = true;
    });
  }
  await loadPromise;
}

async function persist() {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  for (const listener of queueListeners) listener(queue.length);
}

// Records a write made while offline (or one whose network call just
// failed) so it can be replayed, in order, once connectivity returns.
export async function enqueueMutation(kind: string, payload: unknown): Promise<void> {
  await ensureLoaded();
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, kind, payload, createdAt: Date.now() });
  await persist();
  triggerReplay();
}

export function onQueueChange(listener: (count: number) => void): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

export function useQueuedMutationCount(): number {
  const [count, setCount] = useState(queue.length);
  useEffect(() => {
    ensureLoaded().then(() => setCount(queue.length));
    return onQueueChange(setCount);
  }, []);
  return count;
}

// Replays queued mutations in FIFO order. Stops — leaving the rest queued —
// on the first failure, so ordering is preserved for the next attempt (an
// "update" replayed ahead of the "insert" it depends on would just error).
async function replayQueue(handlers: Record<string, Handler>): Promise<void> {
  await ensureLoaded();
  while (queue.length > 0) {
    const next = queue[0];
    const handler = handlers[next.kind];
    if (!handler) {
      // Unknown kind (e.g. an app update renamed a mutation) — drop it
      // rather than blocking the whole queue forever.
      queue.shift();
      await persist();
      continue;
    }
    try {
      await handler(next.payload);
    } catch {
      return; // still offline, or a genuine failure — retry later, in order
    }
    queue.shift();
    await persist();
  }
}

let replayHandlers: Record<string, Handler> | null = null;
let isReplaying = false;

async function triggerReplay() {
  if (!replayHandlers || isReplaying || !isOnline()) return;
  isReplaying = true;
  try {
    await replayQueue(replayHandlers);
  } finally {
    isReplaying = false;
  }
}

// Called once near the app root. Registers how to actually perform each
// queued mutation kind, then replays anything left over from a previous
// offline session and keeps replaying whenever connectivity comes back.
export function initOfflineSync(handlers: Record<string, Handler>): () => void {
  replayHandlers = handlers;
  triggerReplay();
  return onConnectivityChange((online) => {
    if (online) triggerReplay();
  });
}
