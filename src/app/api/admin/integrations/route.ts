import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import {
  createIntegration,
  listDeletedIntegrations,
  listIntegrations,
  toPublicIntegration,
  type IntegrationKind,
} from '@/lib/admin/store';
import { validateExternalUrl } from '@/lib/ssrf';

const VALID_KINDS = new Set(['source', 'api']);
const VALID_AUTH = new Set(['none', 'api-key', 'bearer', 'oauth', 'custom']);
const VALID_CATEGORIES = new Set(['official', 'open-api', 'open-source', 'community', 'non-official', 'custom']);
const VALID_METHODS = new Set(['GET', 'HEAD']);
const VALID_FORMATS = new Set(['json', 'html', 'any']);
const VALID_PAGINATION = new Set(['none', 'page', 'offset', 'cursor']);
const VALID_SCOPES = new Set(['public', 'private', 'local', 'self-hosted']);

export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const q = new URL(req.url).searchParams;

  if (q.get('export') === '1') {
    // Portable export — credential env NAMES only, never values.
    const items = listIntegrations().map(({ history: _h, health: _he, consecutiveFailures: _c, ...rest }) => ({
      ...rest,
      credentialConfigured: Boolean(rest.credentialEnv),
    }));
    return NextResponse.json({ exportedAt: new Date().toISOString(), version: 1, integrations: items });
  }

  const kind = q.get('kind') as IntegrationKind | null;
  const integrations = listIntegrations(kind ?? undefined).map(toPublicIntegration);
  const deleted = q.get('includeDeleted') === '1' ? listDeletedIntegrations().map(toPublicIntegration) : undefined;
  return NextResponse.json({ integrations, ...(deleted ? { deleted } : {}) });
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
  const category = String(body.category ?? 'community');
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  const requestMethod = String(body.requestMethod ?? 'GET');
  if (!VALID_METHODS.has(requestMethod)) return NextResponse.json({ error: 'Invalid request method' }, { status: 400 });
  const responseFormat = String(body.responseFormat ?? 'any');
  if (!VALID_FORMATS.has(responseFormat)) return NextResponse.json({ error: 'Invalid response format' }, { status: 400 });
  const pagination = String(body.pagination ?? 'none');
  if (!VALID_PAGINATION.has(pagination)) return NextResponse.json({ error: 'Invalid pagination' }, { status: 400 });
  const scope = String(body.scope ?? 'public');
  if (!VALID_SCOPES.has(scope)) return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });

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
    cacheTtlSec: clampInt(body.cacheTtlSec, 0, 86_400, 300),
    requestMethod: requestMethod as never,
    requestHeaders: strMap(body.requestHeaders),
    queryParams: strMap(body.queryParams),
    responseFormat: responseFormat as never,
    pagination: pagination as never,
    scope: scope as never,
    category: category as never,
    verified: body.verified === true && category === 'official',
    reviewState: 'approved', // admin-created items are pre-approved
    description: body.description ? String(body.description).slice(0, 1000) : undefined,
    logoUrl: body.logoUrl ? String(body.logoUrl).slice(0, 300) : undefined,
    maintainer: body.maintainer ? String(body.maintainer).slice(0, 120) : undefined,
    features: strList(body.features),
    languages: strList(body.languages),
    regions: strList(body.regions),
    contentTypes: strList(body.contentTypes),
    docsUrl: body.docsUrl ? String(body.docsUrl).slice(0, 300) : undefined,
    legal: legalMap(body.legal),
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

function strMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 20)) {
    const key = k.trim().slice(0, 60);
    if (key && typeof val === 'string') out[key] = val.slice(0, 500);
  }
  return out;
}

function legalMap(v: unknown): { terms?: string; privacy?: string; dmca?: string } {
  if (!v || typeof v !== 'object') return {};
  const o = v as Record<string, unknown>;
  const pick = (k: string) => {
    const s = String(o[k] ?? '').trim();
    return s.startsWith('https://') || s.startsWith('http://') || s.startsWith('/') ? s.slice(0, 300) : undefined;
  };
  return { terms: pick('terms'), privacy: pick('privacy'), dmca: pick('dmca') };
}
