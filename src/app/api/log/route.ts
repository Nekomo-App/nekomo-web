import { NextRequest, NextResponse } from 'next/server';
import { recordError } from '@/lib/errors';
import { rateLimit } from '@/lib/ratelimit';

/** POST /api/log — client-side errors report here (rate-limited, size-capped). */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  if (!rateLimit(`clientlog:${ip}`, 20, 60_000).ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { message?: unknown; context?: unknown; url?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  recordError({
    source: 'client',
    message: body.message,
    context: typeof body.context === 'string' ? body.context : undefined,
    url: typeof body.url === 'string' && body.url.startsWith('/') ? body.url : undefined,
    status: typeof body.status === 'number' ? body.status : undefined,
  });
  return NextResponse.json({ ok: true });
}
