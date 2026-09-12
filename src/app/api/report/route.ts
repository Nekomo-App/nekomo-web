import { NextRequest, NextResponse } from 'next/server';
import { reportBrokenSource } from '@/lib/providers';
import { getReports, resolveReport } from '@/lib/reports';
import { rateLimit } from '@/lib/ratelimit';
import type { ReportKind } from '@/lib/types';

export const dynamic = 'force-dynamic';

const KINDS: ReportKind[] = ['broken-source', 'incorrect-info', 'copyright', 'contact'];

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined);

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  const rl = rateLimit(`report:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!KINDS.includes(body.kind as ReportKind)) {
    return NextResponse.json({ error: 'Invalid report kind' }, { status: 400 });
  }

  await reportBrokenSource({
    kind: body.kind as ReportKind,
    animeId: clip(body.animeId, 64),
    episodeId: clip(body.episodeId, 64),
    name: clip(body.name, 120),
    email: clip(body.email, 160),
    message: clip(body.message, 2000),
  });

  return NextResponse.json({ ok: true });
}

/** Demo admin feed — no auth in this build. */
export async function GET() {
  return NextResponse.json(getReports());
}

/** Mark a report resolved: POST /api/report/resolve?id=... via PATCH here. */
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!resolveReport(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
