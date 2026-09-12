import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import {
  createIntegration,
  listIntegrations,
  toPublicIntegration,
  type IntegrationKind,
} from '@/lib/admin/store';
import { validateExternalUrl } from '@/lib/ssrf';

const VALID_KINDS = new Set(['source', 'api']);
const VALID_AUTH = new Set(['none', 'api-key', 'bearer', 'oauth', 'custom']);

export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const kind = new URL(req.url).searchParams.get('kind') as IntegrationKind | null;
  return NextResponse.json({
    integrations: listIntegrations(kind ?? undefined).map(toPublicIntegration),
  });
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  const kind = String(body.kind ?? 'source') as IntegrationKind;
  const type = String(body.type ?? 'metadata').trim();
  const baseUrl = String(body.baseUrl ?? '').trim();

  if (!name || name.length > 80) return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  if (!VALID_KINDS.has(kind)) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  if (!type || type.length > 40) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  // internal:// is reserved for built-in integrations
  if (!baseUrl.startsWith('internal://')) {
    const check = await validateExternalUrl(baseUrl);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const authMethod = String(body.authMethod ?? 'none');
  if (!VALID_AUTH.has(authMethod)) {
    return NextResponse.json({ error: 'Invalid auth method' }, { status: 400 });
  }

  const item = createIntegration({
    kind,
    name,
    type,
    baseUrl,
    apiVersion: body.apiVersion ? String(body.apiVersion).slice(0, 20) : undefined,
    authMethod: authMethod as never,
    credentialEnv: body.credentialEnv ? String(body.credentialEnv).slice(0, 60) : undefined,
    enabled: body.enabled !== false,
    priority: clampInt(body.priority, 1, 99, 5),
    timeoutMs: clampInt(body.timeoutMs, 500, 60_000, 10_000),
    retries: clampInt(body.retries, 0, 5, 2),
    rateLimitPerMin: clampInt(body.rateLimitPerMin, 1, 600, 60),
    languages: strList(body.languages),
    regions: strList(body.regions),
    contentTypes: strList(body.contentTypes),
    docsUrl: body.docsUrl ? String(body.docsUrl).slice(0, 300) : undefined,
    notes: body.notes ? String(body.notes).slice(0, 500) : undefined,
  });

  return NextResponse.json({ integration: toPublicIntegration(item) }, { status: 201 });
}

function clampInt(v: unknown, min: number, max: number, dflt: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 20);
}
