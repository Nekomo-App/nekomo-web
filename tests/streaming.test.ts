import { describe, expect, it } from 'vitest';
import catalog from '@/data/streaming-sources.json';
import { catalogLinksFor, officialLinksFor } from '@/lib/providers/streaming';
import type { AnimeDetails, StreamingLink } from '@/lib/types';

describe('streaming source catalog', () => {
  it('only contains https URLs; search URLs carry a {q} placeholder', () => {
    expect(catalog.sources.length).toBeGreaterThan(0);
    for (const s of catalog.sources) {
      const target = ('searchUrl' in s ? s.searchUrl : s.url) as string | undefined;
      expect(target?.startsWith('https://'), s.id).toBe(true);
      if ('searchUrl' in s && s.searchUrl) {
        expect(s.searchUrl.includes('{q}'), s.id).toBe(true);
      }
      expect(['sub', 'dub', 'both']).toContain(s.type);
    }
  });

  it('never lists unauthorized scraping sites', () => {
    const banned = ['9anime', 'aniwave', 'gogoanime', 'kissanime', 'hianime', 'zoro.to', 'animepahe'];
    for (const s of catalog.sources) {
      const hay = `${s.id} ${s.name} ${('searchUrl' in s ? s.searchUrl : s.url) ?? ''}`.toLowerCase();
      for (const b of banned) {
        expect(hay.includes(b), `${s.id} must be a licensed source`).toBe(false);
      }
    }
  });

  it('builds a link per source; search URLs get the title substituted', () => {
    const title = "Frieren: Beyond Journey's End";
    const links = catalogLinksFor(title);
    expect(links.length).toBe(catalog.sources.length);
    for (const l of links) {
      expect(l.url).not.toContain('{q}');
    }
    // Sources with a searchUrl must embed the encoded title.
    const searchable = catalog.sources.filter((s) => 'searchUrl' in s && s.searchUrl).length;
    expect(links.filter((l) => l.url.includes(encodeURIComponent(title))).length).toBe(searchable);
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
