export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatScore(score?: number): string {
  return score ? score.toFixed(1) : '—';
}

export function formatStatus(status?: string): string {
  switch (status) {
    case 'AIRING':
      return 'Airing';
    case 'COMPLETED':
      return 'Completed';
    case 'UPCOMING':
      return 'Upcoming';
    default:
      return status ?? '—';
  }
}

export function formatFormat(format?: string): string {
  if (!format) return '—';
  return format === 'MOVIE' ? 'Movie' : format.charAt(0) + format.slice(1).toLowerCase();
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Deterministic hue from a string, for generated fallback artwork. */
export function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function currentSeason(): { season: 'winter' | 'spring' | 'summer' | 'fall'; year: number } {
  const now = new Date();
  const month = now.getUTCMonth();
  const season =
    month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall';
  return { season, year: now.getUTCFullYear() };
}

export const SEASON_MONTHS: Record<string, [number, number]> = {
  winter: [1, 3],
  spring: [4, 6],
  summer: [7, 9],
  fall: [10, 12],
};

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
