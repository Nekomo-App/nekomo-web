import { describe, expect, it } from 'vitest';
import catalog from '@/data/streaming-sources.json';
import { catalogLinksFor, officialLinksFor } from '@/lib/providers/streaming';
import type { AnimeDetails, StreamingLink } from '@/lib/types';

describe('streaming source catalog', () => {
  it('only contains https search URLs with a {q} placeholder', () => {
    expect(catalog.sources.length).toBeGreaterThan(0);
    for (const s of catalog.sources) {
      expect(s.searchUrl.startsWith('https://'), s.id).toBe(true);
      expect(s.searchUrl.includes('{q}'), s.id).toBe(true);
      expect(['sub', 'dub', 'both']).toContain(s.type);
    }
  });

  it('never lists unauthorized scraping sites', () => {
    const banned = ['9anime', 'aniwave', 'gogoanime', 'kissanime', 'hianime', 'zoro.to', 'animepahe'];
    for (const s of catalog.sources) {
      const hay = `${s.id} ${s.name} ${s.searchUrl}`.toLowerCase();
      for (const b of banned) {
        expect(hay.includes(b), `${s.id} must be a licensed source`).toBe(false);
      }
    }
  });

  it('builds a link per source with the title substituted', () => {
    const title = "Frieren: Beyond Journey's End";
    const links = catalogLinksFor(title);
    expect(links.length).toBe(catalog.sources.length);
    for (const l of links) {
      expect(l.url).not.toContain('{q}');
      expect(l.url).toContain(encodeURIComponent(title));
    }
  });

  it('marks free sources', () => {
    const links = catalogLinksFor('Test Title');
    expect(links.some((l) => l.free)).toBe(true);
    expect(links.some((l) => !l.free)).toBe(true);
  });

  it('puts provider links first and dedupes by platform', () => {
    const providerLink: StreamingLink = {
      platform: 'Crunchyroll',
      url: 'https://www.crunchyroll.com/series/XYZ',
      type: 'both',
    };
    const anime = { title: 'Test Title', streamingLinks: [providerLink] } as AnimeDetails;
    const links = officialLinksFor(anime);
    expect(links[0]).toBe(providerLink);
    expect(links.length).toBeGreaterThan(catalog.sources.length - 1);
    const names = links.map((l) => l.platform.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('falls back to the catalog when the provider supplies nothing', () => {
    const anime = { title: 'Test Title', streamingLinks: [] } as unknown as AnimeDetails;
    const links = officialLinksFor(anime);
    expect(links.length).toBe(catalog.sources.length);
  });
});
