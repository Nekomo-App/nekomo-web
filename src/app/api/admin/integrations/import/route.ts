import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { createIntegration, findIntegrationByName, updateIntegration } from '@/lib/admin/store';
import { validateExternalUrl } from '@/lib/ssrf';

/**
 * POST { items: Integration[] } — import integrations from an export file.
 * Items with a name matching an existing integration update it; others are
 * created. Credential values are never imported — only env var names.
 */
export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: 'items[] required' }, { status: 400 });
  }

  const results: { name: string; ok: boolean; action?: string; error?: string }[] = [];
  for (const raw of body.items.slice(0, 100)) {
    try {
      if (!raw || typeof raw !== 'object') throw new Error('not an object');
      const it = raw as Record<string, unknown>;
      const name = String(it.name ?? '').trim();
      const baseUrl = String(it.baseUrl ?? '').trim();
      if (!name || !baseUrl) throw new Error('name and baseUrl required');
      if (!baseUrl.startsWith('internal://')) {
        const check = await validateExternalUrl(baseUrl);
        if (!check.ok) throw new Error(check.error ?? 'URL rejected');
      }
      const existing = findIntegrationByName(name);
      const fields = {
        kind: it.kind === 'api' ? 'api' : 'source',
        name,
        type: String(it.type ?? 'metadata').slice(0, 40),
        baseUrl,
        description: it.description ? String(it.description).slice(0, 1000) : undefined,
        docsUrl: it.docsUrl ? String(it.docsUrl).slice(0, 300) : undefined,
      } as const;
      if (existing) {
        updateIntegration(existing.id, fields);
        results.push({ name, ok: true, action: 'updated' });
      } else {
        createIntegration({ ...fields, reviewState: 'pending', enabled: false });
        results.push({ name, ok: true, action: 'created (pending review)' });
      }
    } catch (e) {
      results.push({ name: String((raw as Record<string, unknown>)?.name ?? '?'), ok: false, error: e instanceof Error ? e.message : 'failed' });
    }
  }
  return NextResponse.json({ results, imported: results.filter((r) => r.ok).length });
}
