import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getIntegration, toPublicIntegration } from '@/lib/admin/store';
import { checkAllIntegrations, checkIntegration } from '@/lib/admin/checks';
import { rateLimit } from '@/lib/ratelimit';

/**
 * POST { id } — run the full check suite on one integration.
 * POST { all: true, includeDisabled? } — check everything.
 */
export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit('admin-test', 10, 60_000).ok) {
    return NextResponse.json({ error: 'Rate limited — try again shortly' }, { status: 429 });
  }

  let body: { id?: string; all?: boolean; includeDisabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.all) {
    const results = await checkAllIntegrations({ includeDisabled: body.includeDisabled === true });
    return NextResponse.json({
      results,
      summary: { total: results.length, ok: results.filter((r) => r.result.ok).length },
    });
  }

  const item = getIntegration(String(body.id ?? ''));
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const result = await checkIntegration(item);
  return NextResponse.json({ integration: toPublicIntegration(item), result });
}
