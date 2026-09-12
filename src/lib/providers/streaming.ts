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

/**
 * Official viewing options for titles Nekomo can't stream itself.
 * Free/ad-supported platforms and licensor-run YouTube channels first —
 * Muse Asia, AniOne Asia, and GundamInfo legally upload full episodes.
 */
export function officialLinksFor(anime: AnimeDetails): StreamingLink[] {
  if (anime.streamingLinks.length) return anime.streamingLinks;
  const q = encodeURIComponent(anime.title);
  return [
    { platform: 'Muse Asia (YouTube)', url: `https://www.youtube.com/@MuseAsia/search?query=${q}`, type: 'sub', note: 'Free · licensed uploads · Asia region' },
    { platform: 'AniOne Asia (YouTube)', url: `https://www.youtube.com/@AniOneAsia/search?query=${q}`, type: 'sub', note: 'Free · licensed uploads · Asia region' },
    { platform: 'GundamInfo (YouTube)', url: `https://www.youtube.com/@GundamInfo/search?query=${q}`, type: 'both', note: 'Free · official Gundam channel' },
    { platform: 'TMS Anime (YouTube)', url: `https://www.youtube.com/@TMSAnimeOfficial/search?query=${q}`, type: 'both', note: 'Free · licensor-run channel' },
    { platform: 'RetroCrush', url: `https://www.retrocrush.tv/search?term=${q}`, type: 'dub', note: 'Free · ad-supported classic anime' },
    { platform: 'Tubi', url: `https://tubitv.com/search/${q}`, type: 'dub', note: 'Free · ad-supported' },
    { platform: 'Pluto TV', url: `https://pluto.tv/en/search/details?query=${q}`, type: 'both', note: 'Free · ad-supported' },
    { platform: 'Crunchyroll', url: `https://www.crunchyroll.com/search?q=${q}`, type: 'both', note: 'Subscription + free tier' },
    { platform: 'HIDIVE', url: `https://www.hidive.com/search?q=${q}`, type: 'both', note: 'Subscription' },
    { platform: 'Netflix', url: `https://www.netflix.com/search?q=${q}`, type: 'both', note: 'Subscription' },
    { platform: 'Hulu', url: `https://www.hulu.com/search?q=${q}`, type: 'both', note: 'Subscription' },
    { platform: 'Prime Video', url: `https://www.amazon.com/s?k=${q}&i=instant-video`, type: 'both', note: 'Subscription / purchase' },
  ];
}
