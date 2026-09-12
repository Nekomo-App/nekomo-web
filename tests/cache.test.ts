import { describe, expect, it, vi } from 'vitest';
import { cached, cacheBust, cacheClear, cacheStats } from '@/lib/cache';

describe('TTL cache', () => {
  it('caches values within the TTL', async () => {
    cacheClear();
    const fn = vi.fn().mockResolvedValue(42);
    expect(await cached('k1', 60_000, fn)).toBe(42);
    expect(await cached('k1', 60_000, fn)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('expires entries past the TTL', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockResolvedValue('v');
    await cached('k2', 1000, fn);
    vi.advanceTimersByTime(2000);
    await cached('k2', 1000, fn);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('supports prefix busting and clear', async () => {
    cacheClear();
    await cached('jk:a', 60_000, async () => 1);
    await cached('other:b', 60_000, async () => 2);
    cacheBust('jk:');
    expect(cacheStats().size).toBe(1);
    cacheClear();
    expect(cacheStats().size).toBe(0);
  });
});
