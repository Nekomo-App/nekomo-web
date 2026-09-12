import { NextResponse } from 'next/server';
import { createIntegration, listPublicSources, notify, toPublicSource } from '@/lib/admin/store';
import { validateExternalUrl } from '@/lib/ssrf';
import { rateLimit } from '@/lib/ratelimit';

/** GET — public source directory: approved + enabled sources only. */
export async function GET() {
  return NextResponse.json({ sources: listPublicSources().map(toPublicSource) });
}

/**
 * POST — submit a custom source for review.
 * Always lands as category 'custom', reviewState 'pending', disabled —
 * never publicly listed until an admin approves and enables it.
 */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  if (!rateLimit(`source-submit:${ip}`, 3, 60_000).ok) {
    return NextResponse.json({ error: 'Too many submissions — try again later' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  const url = String(body.url ?? '').trim();
  const description = String(body.description ?? '').trim();
  if (!name || name.length > 80 || name.length < 2) {
    return NextResponse.json({ error: 'A source name (2–80 chars) is required' }, { status: 400 });
  }
  const check = await validateExternalUrl(url);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const item = createIntegration({
    kind: 'source',
    name,
    type: 'custom',
    baseUrl: url,
    description: description ? description.slice(0, 500) : undefined,
    category: 'custom',
    reviewState: 'pending',
    verified: false,
    enabled: false,
    submittedBy: 'public',
    features: Array.isArray(body.features) ? body.features.map(String).slice(0, 10) : [],
    notes: String(body.notes ?? '').slice(0, 300) || undefined,
  });
  notify('info', `New source submitted: ${name}`, 'Awaiting admin review');
  return NextResponse.json({ ok: true, id: item.id, message: 'Submitted — it will appear after admin review.' }, { status: 201 });
}
