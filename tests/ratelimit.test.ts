import { describe, expect, it, vi } from 'vitest';
import { rateLimit } from '@/lib/ratelimit';

describe('rate limiter', () => {
  it('allows up to the limit then blocks', () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('uses separate buckets per key', () => {
    const a = `t:${Math.random()}`;
    const b = `t:${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });

  it('resets after the window', () => {
    vi.useFakeTimers();
    const key = `t:${Math.random()}`;
    rateLimit(key, 1, 1000);
    expect(rateLimit(key, 1, 1000).ok).toBe(false);
    vi.advanceTimersByTime(1500);
    expect(rateLimit(key, 1, 1000).ok).toBe(true);
    vi.useRealTimers();
  });
});
