import { describe, expect, it } from 'vitest';
import { localSearch, localById, localTrending, localGenres } from '@/lib/providers/local';
import { maskSecret } from '@/lib/admin/store';

describe('local fallback catalog', () => {
  it('returns results for an empty query', () => {
    const res = localSearch({});
    expect(res.items.length).toBeGreaterThan(0);
  });

  it('filters by query text', () => {
    const all = localSearch({});
    const first = all.items[0];
    const res = localSearch({ q: first.title.split(' ')[0] });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.some((i) => i.id === first.id)).toBe(true);
  });

  it('finds items by id', () => {
    const all = localSearch({});
    const d = localById(all.items[0].id);
    expect(d?.id).toBe(all.items[0].id);
  });

  it('provides genres and trending rows', () => {
    expect(localGenres().length).toBeGreaterThan(0);
    expect(localTrending().length).toBeGreaterThan(0);
  });

  it('originals carry authorized streams only', () => {
    const all = localSearch({});
    const original = all.items.find((i) => i.hasOfficialStream);
    const d = original ? localById(original.id) : null;
    for (const ep of d?.episodeList ?? []) {
      if (ep.stream) {
        expect(ep.stream.licensed).toBe(true);
        expect(ep.stream.url).toMatch(/^https?:/);
      }
    }
  });
});
