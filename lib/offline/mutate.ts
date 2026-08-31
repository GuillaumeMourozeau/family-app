import { isOnline } from "@/lib/offline/network";
import { enqueueMutation } from "@/lib/offline/queue";

// The single entry point every hook mutation should go through. Skips the
// live network call entirely while offline (queueing `payload` under
// `kind` for replay once connectivity returns), and also falls back to
// queueing if `performOnline` throws — NetInfo occasionally lags reality,
// so "we thought we were online" and "the request actually failed" both
// end up handled the same way: don't lose the change, retry it later.
// `performOnline` must throw on failure (supabase-js returns `{ error }`
// instead of throwing, so callers — see lib/offline/handlers.ts — convert
// that into a real throw) or this fallback can't detect anything went wrong.
export async function withOfflineQueue(kind: string, payload: unknown, performOnline: () => Promise<void>): Promise<void> {
  if (!isOnline()) {
    await enqueueMutation(kind, payload);
    return;
  }
  try {
    await performOnline();
  } catch {
    await enqueueMutation(kind, payload);
  }
}
