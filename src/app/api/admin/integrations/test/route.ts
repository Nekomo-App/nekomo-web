import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { audit, getIntegration, recordIntegrationEvent, toPublicIntegration } from '@/lib/admin/store';
import { validateExternalUrl } from '@/lib/ssrf';
import { rateLimit } from '@/lib/ratelimit';

const MAX_RESPONSE_BYTES = 256 * 1024;

/** POST { id } — health-check an integration by fetching its base URL. */
export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit('admin-test', 10, 60_000).ok) {
    return NextResponse.json({ error: 'Rate limited — try again shortly' }, { status: 429 });
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const item = getIntegration(String(body.id ?? ''));
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Built-in integrations report their own status
  if (item.baseUrl.startsWith('internal://')) {
    recordIntegrationEvent(item.id, true, 0);
    return NextResponse.json({ integration: toPublicIntegration(item), result: { ok: true, note: 'Internal integration' } });
  }

  const check = await validateExternalUrl(item.baseUrl);
  if (!check.ok) {
    recordIntegrationEvent(item.id, false, undefined, check.error);
    return NextResponse.json({ integration: toPublicIntegration(item), result: { ok: false, error: check.error } }, { status: 400 });
  }

  const started = Date.now();
  try {
    const res = await fetch(check.url!, {
      signal: AbortSignal.timeout(Math.min(item.timeoutMs, 15_000)),
      redirect: 'manual',
      headers: item.credentialEnv && process.env[item.credentialEnv]
        ? authHeader(item.authMethod, process.env[item.credentialEnv]!)
        : undefined,
    });
    const latencyMs = Date.now() - started;

    // Cap response size — read at most MAX_RESPONSE_BYTES
    const reader = res.body?.getReader();
    let bytes = 0;
    if (reader) {
      while (bytes < MAX_RESPONSE_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
      }
      await reader.cancel();
    }

    const ok = res.status < 500;
    recordIntegrationEvent(item.id, ok, latencyMs, ok ? undefined : `HTTP ${res.status}`);
    return NextResponse.json({
      integration: toPublicIntegration(item),
      result: { ok, status: res.status, latencyMs, bytesRead: bytes },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed';
    recordIntegrationEvent(item.id, false, Date.now() - started, msg);
    audit('integration.test.fail', item.id, msg);
    return NextResponse.json({
      integration: toPublicIntegration(item),
      result: { ok: false, error: msg.includes('TimeoutError') ? 'Timed out' : 'Connection failed' },
    });
  }
}

function authHeader(method: string, secret: string): Record<string, string> {
  switch (method) {
    case 'bearer':
      return { authorization: `Bearer ${secret}` };
    case 'api-key':
      return { 'x-api-key': secret };
    default:
      return {};
  }
}
