import crypto from 'node:crypto';

/**
 * Server-side admin data store.
 *
 * In-memory for now (single-instance deployments / dev). Swap these functions
 * for database-backed implementations when a real database is added — the API
 * routes only depend on these signatures.
 */

export type IntegrationKind = 'source' | 'api';
export type HealthStatus = 'unknown' | 'healthy' | 'degraded' | 'down';
export type AuthMethod = 'none' | 'api-key' | 'bearer' | 'oauth' | 'custom';

export interface Integration {
  id: string;
  kind: IntegrationKind;
  name: string;
  type: string; // 'metadata' | 'catalog' | 'streaming' | 'subtitles' | 'images' | ...
  baseUrl: string;
  apiVersion?: string;
  authMethod: AuthMethod;
  /** Name of the env var holding the credential — the value never leaves the server. */
  credentialEnv?: string;
  enabled: boolean;
  priority: number;
  timeoutMs: number;
  retries: number;
  rateLimitPerMin: number;
  languages: string[];
  regions: string[];
  contentTypes: string[];
  docsUrl?: string;
  notes?: string;
  health: {
    status: HealthStatus;
    latencyMs?: number;
    errorCount: number;
    okCount: number;
    lastOk?: string;
    lastFail?: string;
    lastError?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  ts: string;
  action: string;
  target?: string;
  detail?: string;
}

export interface FeatureFlags {
  maintenance: boolean;
  debugLogging: boolean;
  apiLogging: boolean;
  localFallback: boolean;
}

const now = () => new Date().toISOString();

const integrations = new Map<string, Integration>();
const auditLog: AuditEntry[] = [];
const flags: FeatureFlags = {
  maintenance: false,
  debugLogging: false,
  apiLogging: true,
  localFallback: true,
};

function seed(): void {
  if (integrations.size) return;
  const mk = (partial: Partial<Integration> & Pick<Integration, 'name' | 'kind' | 'type' | 'baseUrl'>): Integration => ({
    id: crypto.randomUUID(),
    authMethod: 'none',
    enabled: true,
    priority: 1,
    timeoutMs: 10_000,
    retries: 2,
    rateLimitPerMin: 60,
    languages: [],
    regions: [],
    contentTypes: [],
    health: { status: 'unknown', errorCount: 0, okCount: 0 },
    createdAt: now(),
    updatedAt: now(),
    ...partial,
  });
  integrations.set('jikan', mk({ id: 'jikan', kind: 'api', name: 'Jikan (MyAnimeList)', type: 'metadata', baseUrl: 'https://api.jikan.moe/v4', docsUrl: 'https://docs.api.jikan.moe/', priority: 1, rateLimitPerMin: 60, notes: 'Primary metadata provider' }));
  integrations.set('local-catalog', mk({ id: 'local-catalog', kind: 'source', name: 'Nekomo Local Catalog', type: 'catalog', baseUrl: 'internal://local', priority: 9, notes: 'Bundled fallback catalog — used when remote providers fail' }));
  integrations.set('nekobo-streams', mk({ id: 'nekomo-streams', kind: 'source', name: 'Nekomo Originals Streams', type: 'streaming', baseUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket', priority: 1, contentTypes: ['video'], notes: 'Creative Commons licensed sample streams (Blender Foundation)' }));
}
seed();

export function audit(action: string, target?: string, detail?: string): void {
  auditLog.unshift({ ts: now(), action, target, detail });
  if (auditLog.length > 200) auditLog.pop();
}

export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}

export function getFlags(): FeatureFlags {
  return { ...flags };
}

export function setFlags(patch: Partial<FeatureFlags>): FeatureFlags {
  Object.assign(flags, patch);
  audit('flags.update', undefined, JSON.stringify(patch));
  return { ...flags };
}

export function listIntegrations(kind?: IntegrationKind): Integration[] {
  seed();
  const all = [...integrations.values()].filter((i) => !kind || i.kind === kind);
  return all.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export function getIntegration(id: string): Integration | undefined {
  return integrations.get(id);
}

export function findIntegrationByName(name: string): Integration | undefined {
  return [...integrations.values()].find((i) => i.name.toLowerCase() === name.toLowerCase());
}

export type IntegrationInput = Omit<Integration, 'id' | 'createdAt' | 'updatedAt' | 'health'>;

export function createIntegration(input: Partial<Integration>): Integration {
  const item: Integration = {
    id: crypto.randomUUID(),
    kind: 'source',
    name: 'Unnamed',
    type: 'metadata',
    baseUrl: '',
    authMethod: 'none',
    enabled: true,
    priority: 5,
    timeoutMs: 10_000,
    retries: 2,
    rateLimitPerMin: 60,
    languages: [],
    regions: [],
    contentTypes: [],
    health: { status: 'unknown', errorCount: 0, okCount: 0 },
    createdAt: now(),
    updatedAt: now(),
    ...input,
  };
  integrations.set(item.id, item);
  audit('integration.create', item.id, `${item.kind}:${item.name}`);
  return item;
}

export function updateIntegration(id: string, patch: Partial<Integration>): Integration | undefined {
  const item = integrations.get(id);
  if (!item) return undefined;
  const { id: _id, createdAt: _c, health: _h, ...safe } = patch;
  Object.assign(item, safe, { updatedAt: now() });
  audit('integration.update', id, Object.keys(safe).join(','));
  return item;
}

export function deleteIntegration(id: string): boolean {
  const item = integrations.get(id);
  if (!item) return false;
  integrations.delete(id);
  audit('integration.delete', id, `${item.kind}:${item.name}`);
  return true;
}

/** Record the result of an integration call (health + counters). */
export function recordIntegrationEvent(id: string, ok: boolean, latencyMs?: number, error?: string): void {
  const item = integrations.get(id);
  if (!item) return;
  const h = item.health;
  if (ok) {
    h.okCount++;
    h.lastOk = now();
    if (latencyMs != null) h.latencyMs = Math.round(latencyMs);
    h.status = h.errorCount > 5 && h.okCount < h.errorCount ? 'degraded' : 'healthy';
  } else {
    h.errorCount++;
    h.lastFail = now();
    h.lastError = error?.slice(0, 200);
    h.status = h.errorCount >= 5 ? 'down' : 'degraded';
  }
  item.updatedAt = now();
}

/** Which integrations of a type should be tried, in priority order. */
export function enabledIntegrations(kind: IntegrationKind, type?: string): Integration[] {
  return listIntegrations(kind).filter((i) => i.enabled && (!type || i.type === type));
}

/** Never serialize credential values — only whether one is configured. */
export function toPublicIntegration(i: Integration) {
  const { credentialEnv, ...rest } = i;
  return {
    ...rest,
    hasCredential: Boolean(credentialEnv && process.env[credentialEnv]),
    credentialEnv: credentialEnv ? maskEnvName(credentialEnv) : undefined,
  };
}

function maskEnvName(name: string): string {
  if (name.length <= 4) return '••••';
  return `${name.slice(0, 3)}•••${name.slice(-2)}`;
}

/** Mask any secret-like value for display. */
export function maskSecret(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}
