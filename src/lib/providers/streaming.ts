// Streaming policy: Nekomo only ever returns streams it owns, licenses, or
// has explicit permission to embed. "Nekomo Originals" episodes point at
// Creative Commons–licensed films (© Blender Foundation, CC-BY) that are
// explicitly cleared for embedding. Everything else resolves to official
// platform links — never scraped or proxied third-party players.
//
// The link catalog lives in src/data/streaming-sources.json — edit that file
// to add/remove sources; every provider and page picks it up automatically.

import catalog from '@/data/streaming-sources.json';
import type { AnimeDetails, AuthorizedStream, Episode, StreamingLink } from '@/lib/types';

interface CatalogSource {
  id: string;
  name: string;
  /** Search URL; `{q}` is replaced with the URL-encoded anime title. */
  searchUrl?: string;
  /** Fallback homepage URL for sources without a title-search (e.g. self-hosted). */
  url?: string;
  type: StreamingLink['type'];
  free?: boolean;
  region?: string;
  note?: string;
  enabled?: boolean;
}

const sources = (catalog.sources as CatalogSource[]).filter((s) => s.enabled !== false);

/** Legal viewing links built from the JSON source catalog for a title. */
export function catalogLinksFor(title: string): StreamingLink[] {
  const q = encodeURIComponent(title);
  return sources
    .filter((s) => s.searchUrl || s.url)
    .map((s) => ({
      platform: s.name,
      url: s.searchUrl ? s.searchUrl.replace('{q}', q) : s.url!,
      type: s.type,
      free: s.free ?? false,
      note: s.note,
    }));
}

export function getAuthorizedStreamFor(
  anime: AnimeDetails,
  episode: Episode,
): AuthorizedStream | null {
  if (!episode.stream?.licensed) return null;
  return episode.stream;
}

/**
 * Official viewing options for titles Nekomo can't stream itself.
 * Provider-supplied links come first, then the free/licensed catalog —
 * deduplicated by platform name.
 */
export function officialLinksFor(anime: AnimeDetails): StreamingLink[] {
  const fromCatalog = catalogLinksFor(anime.title);
  if (!anime.streamingLinks.length) return fromCatalog;
  const seen = new Set(anime.streamingLinks.map((l) => l.platform.toLowerCase()));
  return [
    ...anime.streamingLinks,
    ...fromCatalog.filter((l) => !seen.has(l.platform.toLowerCase())),
  ];
}
