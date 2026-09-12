// Streaming policy: Nekomo only ever returns streams it owns, licenses, or
// has explicit permission to embed. "Nekomo Originals" episodes point at
// Creative Commons–licensed films (© Blender Foundation, CC-BY) that are
// explicitly cleared for embedding. Everything else resolves to official
// platform links — never scraped or proxied third-party players.

import type { AnimeDetails, AuthorizedStream, Episode, StreamingLink } from '@/lib/types';

export function getAuthorizedStreamFor(
  anime: AnimeDetails,
  episode: Episode,
): AuthorizedStream | null {
  if (!episode.stream?.licensed) return null;
  return episode.stream;
}

export function officialLinksFor(anime: AnimeDetails): StreamingLink[] {
  if (anime.streamingLinks.length) return anime.streamingLinks;
  const q = encodeURIComponent(anime.title);
  return [
    { platform: 'Crunchyroll', url: `https://www.crunchyroll.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
    { platform: 'HIDIVE', url: `https://www.hidive.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
    { platform: 'Netflix', url: `https://www.netflix.com/search?q=${q}`, type: 'both', note: 'Search official catalog' },
  ];
}
