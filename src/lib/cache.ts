// Simple in-memory TTL cache for provider responses (per server process).
// Dedupes concurrent requests for the same key, and serves stale data
// when the refresh fails — so an unreachable provider never blocks the UI.

type Entry = { value: unknown; expires: number; staleUntil: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_KEYS = 500;

/** Stale entries may be served for up to this long after expiry. */
const STALE_GRACE_MS = 30 * 60_000;

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  // Collapse concurrent misses into one request.
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const run = (async () => {
    try {
      const value = await fn();
      if (store.size >= MAX_KEYS) {
        // evict oldest ~10%
        const keys = Array.from(store.keys()).slice(0, Math.ceil(MAX_KEYS / 10));
        for (const k of keys) store.delete(k);
      }
      store.set(key, {
        value,
        expires: Date.now() + ttlMs,
        staleUntil: Date.now() + Math.max(ttlMs * 4, STALE_GRACE_MS),
      });
      return value;
    } catch (err) {
      // Serve stale rather than fail — keeps the site instant when an
      // upstream provider is down and its circuit breaker is open.
      const stale = store.get(key);
      if (stale && stale.staleUntil > Date.now()) return stale.value as T;
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, run);
  return run;
}

export function cacheBust(prefix: string): void {
  for (const k of Array.from(store.keys())) if (k.startsWith(prefix)) store.delete(k);
}

export function cacheStats(): { size: number; max: number; inflight: number } {
  return { size: store.size, max: MAX_KEYS, inflight: inflight.size };
}

export function cacheClear(): void {
  store.clear();
}
