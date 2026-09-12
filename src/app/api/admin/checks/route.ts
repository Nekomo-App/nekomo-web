import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { checkAllIntegrations, startSourceScheduler } from '@/lib/admin/checks';

/**
 * POST — run scheduled source checks.
 * Admin session, or a cron caller presenting CRON_SECRET.
 * Configure SOURCE_CHECK_INTERVAL_MIN for in-process scheduling, or point
 * an external cron (Vercel Cron / Netlify scheduled function) at this route.
 */
export async function POST(req: Request) {
  const cronOk =
    process.env.CRON_SECRET &&
    req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  if (!isAdmin() && !cronOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results = await checkAllIntegrations();
  return NextResponse.json({
    ranAt: new Date().toISOString(),
    total: results.length,
    failed: results.filter((r) => !r.result.ok).map((r) => ({ id: r.id, name: r.name, error: r.result.error })),
  });
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  startSourceScheduler(); // idempotent — starts interval on long-lived servers
  return NextResponse.json({
    scheduler: Number(process.env.SOURCE_CHECK_INTERVAL_MIN ?? 0) > 0 ? 'in-process' : 'external-cron',
    intervalMin: Number(process.env.SOURCE_CHECK_INTERVAL_MIN ?? 0) || null,
  });
}
