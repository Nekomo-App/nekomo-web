import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { deleteIntegration, toPublicIntegration, updateIntegration } from '@/lib/admin/store';
import { validateExternalUrl } from '@/lib/ssrf';

const EDITABLE = new Set([
  'name', 'type', 'baseUrl', 'apiVersion', 'authMethod', 'credentialEnv', 'enabled',
  'priority', 'timeoutMs', 'retries', 'rateLimitPerMin', 'languages', 'regions',
  'contentTypes', 'docsUrl', 'notes',
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (EDITABLE.has(key)) patch[key] = body[key];
  }

  if (patch.baseUrl && !String(patch.baseUrl).startsWith('internal://')) {
    const check = await validateExternalUrl(String(patch.baseUrl));
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const item = updateIntegration(params.id, patch);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ integration: toPublicIntegration(item) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!deleteIntegration(params.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
