type CacheEntry<T> = { value: T; timestamp: number };

export function getCached<T>(key: string, ttlMs: number, storage: Storage = localStorage): T | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttlMs) {
      storage.removeItem(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, value: T, storage: Storage = localStorage): void {
  try {
    storage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }));
  } catch {}
}
