import { NextRequest, NextResponse } from 'next/server';
import { getAnimeSearchResults } from '@/lib/providers';
import { rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  const rl = rateLimit(`suggest:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const q = req.nextUrl.searchParams.get('q')?.slice(0, 100) ?? '';
  if (!q.trim()) return NextResponse.json([]);

  try {
    const res = await getAnimeSearchResults({ q, limit: 6 });
    return NextResponse.json(
      res.items.slice(0, 6).map((a) => ({ id: a.id, title: a.title, year: a.year, format: a.format })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
