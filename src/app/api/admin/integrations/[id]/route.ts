import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import {
  approveIntegration,
  audit,
  deleteIntegration,
  purgeIntegration,
  rejectIntegration,
  restoreIntegration,
  restoreIntegrationVersion,
  toPublicIntegration,
  updateIntegration,
} from '@/lib/admin/store';
import { validateExternalUrl } from '@/lib/ssrf';

const EDITABLE = new Set([
  'name', 'type', 'baseUrl', 'apiVersion', 'authMethod', 'credentialEnv', 'enabled',
  'priority', 'timeoutMs', 'retries', 'rateLimitPerMin', 'cacheTtlSec', 'languages',
  'regions', 'contentTypes', 'docsUrl', 'notes', 'category', 'description', 'logoUrl',
  'maintainer', 'features', 'legal', 'requestMethod', 'requestHeaders', 'queryParams',
  'responseFormat', 'pagination', 'scope', 'verified', 'reviewState',
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Action-style updates
  const action = String(body.action ?? '');
  if (action) {
    switch (action) {
      case 'approve': {
        const item = approveIntegration(params.id);
        return item
          ? NextResponse.json({ integration: toPublicIntegration(item) })
          : NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      case 'reject': {
        const item = rejectIntegration(params.id);
        return item
          ? NextResponse.json({ integration: toPublicIntegration(item) })
          : NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      case 'restore':
        return restoreIntegration(params.id)
          ? NextResponse.json({ ok: true })
          : NextResponse.json({ error: 'Not found or not deleted' }, { status: 404 });
      case 'restore-version': {
        const item = restoreIntegrationVersion(params.id, Number(body.index ?? 0));
        return item
          ? NextResponse.json({ integration: toPublicIntegration(item) })
          : NextResponse.json({ error: 'No such version' }, { status: 404 });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  }

  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (EDITABLE.has(key)) patch[key] = body[key];
  }

  if (patch.baseUrl && !String(patch.baseUrl).startsWith('internal://')) {
    const check = await validateExternalUrl(String(patch.baseUrl));
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  }
  // Never let a non-official source claim verified status.
  if (patch.verified === true && patch.category && patch.category !== 'official') {
    patch.verified = false;
  }
  // Clearing autoDisabled when re-enabling is a deliberate admin choice.
  if (patch.enabled === true) patch.autoDisabled = false;
  if (patch.autoDisabled !== undefined) patch.autoDisabled = Boolean(patch.autoDisabled);

  const item = updateIntegration(params.id, patch);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ integration: toPublicIntegration(item) });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const hard = new URL(req.url).searchParams.get('hard') === '1';
  const result = hard ? purgeIntegration(params.id) : deleteIntegration(params.id);
  if (result === 'builtin') {
    return NextResponse.json({ error: 'Built-in integrations can be disabled, not deleted' }, { status: 400 });
  }
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!hard) audit('integration.soft-delete', params.id);
  return NextResponse.json({ ok: true });
}
