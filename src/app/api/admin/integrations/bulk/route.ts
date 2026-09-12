import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { audit, deleteIntegration, getIntegration, updateIntegration } from '@/lib/admin/store';
import { checkIntegration } from '@/lib/admin/checks';
import { rateLimit } from '@/lib/ratelimit';

const ACTIONS = new Set(['test', 'enable', 'disable', 'delete']);

/** POST { ids: string[], action } — bulk operations on integrations. */
export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit('admin-bulk', 8, 60_000).ok) {
    return NextResponse.json({ error: 'Rate limited — try again shortly' }, { status: 429 });
  }

  let body: { ids?: unknown; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 50) : [];
  const action = String(body.action ?? '');
  if (!ids.length || !ACTIONS.has(action)) {
    return NextResponse.json({ error: 'ids[] + valid action required' }, { status: 400 });
  }

  const results: { id: string; ok: boolean; detail?: string }[] = [];
  for (const id of ids) {
    const item = getIntegration(id);
    if (!item || item.deletedAt) {
      results.push({ id, ok: false, detail: 'not found' });
      continue;
    }
    switch (action) {
      case 'test': {
        const r = await checkIntegration(item);
        results.push({ id, ok: r.ok, detail: r.error ?? `${r.latencyMs ?? 0}ms` });
        break;
      }
      case 'enable':
        updateIntegration(id, { enabled: true, autoDisabled: false });
        results.push({ id, ok: true });
        break;
      case 'disable':
        updateIntegration(id, { enabled: false });
        results.push({ id, ok: true });
        break;
      case 'delete': {
        const r = deleteIntegration(id);
        results.push({ id, ok: r === true, detail: r === 'builtin' ? 'built-in — cannot delete' : undefined });
        break;
      }
    }
  }
  audit('integrations.bulk', undefined, `${action} × ${results.filter((r) => r.ok).length}/${ids.length}`);
  return NextResponse.json({ results });
}
