import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "offlineCache";

// A per-hook snapshot of "the last data we successfully fetched", so a
// screen has something real to show immediately on launch — including
// while offline, before any network attempt has had a chance to fail.
export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    // Best-effort — a cache write failing (e.g. storage full) shouldn't
    // block the app from using the in-memory data it already has.
  }
}
