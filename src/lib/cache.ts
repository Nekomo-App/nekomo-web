// Simple in-memory TTL cache for provider responses (per server process).

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();
const MAX_KEYS = 500;

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  const value = await fn();
  if (store.size >= MAX_KEYS) {
    // evict oldest ~10%
    const keys = Array.from(store.keys()).slice(0, Math.ceil(MAX_KEYS / 10));
    for (const k of keys) store.delete(k);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export function cacheBust(prefix: string): void {
  for (const k of Array.from(store.keys())) if (k.startsWith(prefix)) store.delete(k);
}

export function cacheStats(): { size: number; max: number } {
  return { size: store.size, max: MAX_KEYS };
}

export function cacheClear(): void {
  store.clear();
}
