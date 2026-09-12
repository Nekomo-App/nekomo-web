import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Server-side admin data store.
 *
 * Backed by an in-memory map with write-through persistence to
 * `.data/admin-store.json` on long-lived servers (dev / self-hosted Node).
 * On serverless platforms writes fail silently and state resets between
 * invocations — attach a database (DATABASE_URL) for durable state there.
 */

export type IntegrationKind = 'source' | 'api';
export type HealthStatus = 'unknown' | 'healthy' | 'degraded' | 'down';
export type AuthMethod = 'none' | 'api-key' | 'bearer' | 'oauth' | 'custom';

/** Source categories — every source is clearly labeled by category. */
export type SourceCategory =
  | 'official'
  | 'open-api'
  | 'open-source'
  | 'community'
  | 'non-official'
  | 'custom';

export type ReviewState = 'approved' | 'pending' | 'rejected';

/** Status shown in the dashboard and public directory. */
export type DisplayStatus =
  | 'working'
  | 'partial'
  | 'offline'
  | 'error'
  | 'review'
  | 'disabled'
  | 'unknown';

export type ApiScope = 'public' | 'private' | 'local' | 'self-hosted';

export const CATEGORY_LABELS: Record<SourceCategory, string> = {
  official: 'Official',
  'open-api': 'Open API',
  'open-source': 'Open Source',
  community: 'Community',
  'non-official': 'Non-Official',
  custom: 'Custom',
};

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
  cacheTtlSec: number;
  requestMethod: 'GET' | 'HEAD';
  /** Non-secret default request headers (never put credentials here). */
  requestHeaders: Record<string, string>;
  /** Static query params appended to requests. */
  queryParams: Record<string, string>;
  responseFormat: 'json' | 'html' | 'any';
  pagination: 'none' | 'page' | 'offset' | 'cursor';
  scope: ApiScope;
  category: SourceCategory;
  /** Admin-confirmed accuracy/licensing review — never set for user submissions. */
  verified: boolean;
  reviewState: ReviewState;
  submittedBy?: string;
  /** Built-in integrations can't be deleted, only disabled. */
  builtin?: boolean;
  /** Set when the system disabled it after repeated failures. */
  autoDisabled?: boolean;
  consecutiveFailures: number;
  description?: string;
  logoUrl?: string;
  maintainer?: string;
  /** Feature flags this source is enabled for. */
  features: string[];
  languages: string[];
  regions: string[];
  contentTypes: string[];
  docsUrl?: string;
  /** Legal / policy links when the provider publishes them. */
  legal: { terms?: string; privacy?: string; dmca?: string };
  notes?: string;
  health: {
    status: HealthStatus;
    latencyMs?: number;
    avgLatencyMs?: number;
    errorCount: number;
    okCount: number;
    lastOk?: string;
    lastFail?: string;
    lastError?: string;
    lastCheckAt?: string;
  };
  deletedAt?: string;
  /** Bounded snapshot history for restore (newest first). */
  history: { at: string; by: string; snapshot: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  ts: string;
  action: string;
  target?: string;
  detail?: string;
  actor?: string;
}

export interface AdminNotification {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  title: string;
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
const notifications: AdminNotification[] = [];
const flags: FeatureFlags = {
  maintenance: false,
  debugLogging: false,
  apiLogging: true,
  localFallback: true,
};

/* ---------------- persistence ---------------- */

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'admin-store.json');
const persistEnabled = () => process.env.NEKO_PERSIST !== '0' && !process.env.VITEST;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function persist(): void {
  if (!persistEnabled()) return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const payload = {
        savedAt: now(),
        flags,
        integrations: [...integrations.values()],
        auditLog: auditLog.slice(0, 200),
        notifications: notifications.slice(0, 100),
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
    } catch {
      // read-only filesystem (serverless) — persistence skipped silently
    }
  }, 250);
  persistTimer.unref?.();
}

function hydrate(): void {
  if (integrations.size) return;
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data.integrations)) {
      for (const i of data.integrations) if (i?.id) integrations.set(i.id, normalize(i));
    }
    if (data.flags) Object.assign(flags, data.flags);
    if (Array.isArray(data.auditLog)) auditLog.push(...data.auditLog);
    if (Array.isArray(data.notifications)) notifications.push(...data.notifications);
  } catch {
    // no saved state — seeds will populate
  }
}

/** Fill defaults for records saved before a field existed. */
function normalize(i: Partial<Integration> & { id: string }): Integration {
  return {
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
    cacheTtlSec: 300,
    requestMethod: 'GET',
    requestHeaders: {},
    queryParams: {},
    responseFormat: 'any',
    pagination: 'none',
    scope: 'public',
    category: 'community',
    verified: false,
    reviewState: 'approved',
    consecutiveFailures: 0,
    features: [],
    languages: [],
    regions: [],
    contentTypes: [],
    legal: {},
    health: { status: 'unknown', errorCount: 0, okCount: 0 },
    history: [],
    createdAt: now(),
    updatedAt: now(),
    ...i,
  };
}

function seed(): void {
  hydrate();
  if (integrations.size) return;
  const mk = (partial: Partial<Integration> & Pick<Integration, 'name' | 'kind' | 'type' | 'baseUrl'>): Integration =>
    normalize({ id: crypto.randomUUID(), builtin: true, ...partial });
  const put = (i: Integration) => integrations.set(i.id, i);

  put(mk({ id: 'jikan', kind: 'api', name: 'Jikan (MyAnimeList)', type: 'metadata', baseUrl: 'https://api.jikan.moe/v4', category: 'open-api', verified: true, scope: 'public', docsUrl: 'https://docs.api.jikan.moe/', description: 'Unofficial but documented MyAnimeList metadata API — primary catalog provider.', maintainer: 'Jikan community', features: ['search', 'metadata', 'images', 'seasonal', 'schedule'], responseFormat: 'json', pagination: 'page', priority: 1, rateLimitPerMin: 60, legal: { terms: 'https://jikan.moe/' }, notes: 'Primary metadata provider' }));
  put(mk({ id: 'anilist', kind: 'api', name: 'AniList', type: 'metadata', baseUrl: 'https://graphql.anilist.co', apiVersion: 'graphql', category: 'open-api', verified: true, scope: 'public', docsUrl: 'https://docs.anilist.co/', description: 'Free open GraphQL API — automatic fallback when Jikan fails. OAuth sign-in + list sync.', maintainer: 'AniList', features: ['search', 'metadata', 'images', 'auth', 'list-sync'], responseFormat: 'json', priority: 2, rateLimitPerMin: 90, legal: { terms: 'https://anilist.co/terms', privacy: 'https://anilist.co/terms' }, notes: 'Free open GraphQL API — automatic fallback when Jikan fails' }));
  put(mk({ id: 'kitsu', kind: 'api', name: 'Kitsu', type: 'metadata', baseUrl: 'https://kitsu.io/api/edge', apiVersion: 'jsonapi', category: 'open-api', verified: true, scope: 'public', docsUrl: 'https://kitsu.docs.apiary.io/', description: 'Free JSON:API — third metadata fallback.', maintainer: 'Kitsu', features: ['search', 'metadata', 'images'], responseFormat: 'json', pagination: 'offset', priority: 3, rateLimitPerMin: 100, notes: 'Free JSON:API — third metadata fallback' }));
  put(mk({ id: 'aniskip', kind: 'api', name: 'AniSkip', type: 'tracking', baseUrl: 'https://api.aniskip.com/v1', category: 'open-source', verified: true, scope: 'public', docsUrl: 'https://github.com/aniskip', description: 'Open-source, community-contributed intro/outro timestamps for the player skip overlay.', maintainer: 'AniSkip contributors', features: ['skip-times'], responseFormat: 'json', priority: 1, rateLimitPerMin: 120, legal: { terms: 'https://github.com/aniskip/aniskip-api/blob/main/LICENSE' }, notes: 'Open-source skip-times API — intro/outro timestamps for the player' }));
  put(mk({ id: 'local-catalog', kind: 'source', name: 'Nekomo Local Catalog', type: 'catalog', baseUrl: 'internal://local', category: 'official', verified: true, scope: 'local', description: 'Bundled fallback catalog — keeps the UI usable when remote providers fail.', maintainer: 'Nekomo', features: ['metadata', 'images', 'episodes'], priority: 9, notes: 'Bundled fallback catalog — used when remote providers fail' }));
  put(mk({ id: 'nekomo-streams', kind: 'source', name: 'Nekomo Originals Streams', type: 'streaming', baseUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket', category: 'official', verified: true, scope: 'public', description: 'Creative Commons–licensed films (© Blender Foundation, CC-BY) mirrored across legal hosts.', maintainer: 'Nekomo', features: ['streaming', 'subtitles'], contentTypes: ['video'], priority: 1, notes: 'Creative Commons licensed sample streams (Blender Foundation)' }));
  // Demonstrates the non-official category: listed for completeness, clearly
  // labeled unverified, pending review, and disabled by default.
  put(mk({ id: 'aniwave', kind: 'source', name: 'AniWave', type: 'streaming', baseUrl: 'https://aniwave.to', category: 'non-official', verified: false, reviewState: 'pending', enabled: false, scope: 'public', description: 'Unofficial third-party index. Not affiliated with, licensed by, or endorsed by Nekomo. Disabled pending review.', maintainer: 'Unknown third party', features: [], docsUrl: 'https://aniwave.to', notes: 'Unverified third-party source — never enabled without admin review' }));
}

/* ---------------- audit + notifications ---------------- */

export function audit(action: string, target?: string, detail?: string, actor = 'admin'): void {
  auditLog.unshift({ ts: now(), action, target, detail, actor });
  if (auditLog.length > 200) auditLog.pop();
  persist();
}

export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}

export function notify(level: AdminNotification['level'], title: string, detail?: string): void {
  notifications.unshift({ id: crypto.randomUUID(), ts: now(), level, title, detail });
  if (notifications.length > 100) notifications.pop();
  persist();
}

export function listNotifications(): AdminNotification[] {
  return [...notifications];
}

/* ---------------- flags ---------------- */

export function getFlags(): FeatureFlags {
  return { ...flags };
}

export function setFlags(patch: Partial<FeatureFlags>): FeatureFlags {
  Object.assign(flags, patch);
  audit('flags.update', undefined, JSON.stringify(patch));
  return { ...flags };
}

/* ---------------- integrations CRUD ---------------- */

export function listIntegrations(kind?: IntegrationKind): Integration[] {
  seed();
  const all = [...integrations.values()].filter((i) => !i.deletedAt && (!kind || i.kind === kind));
  return all.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export function listDeletedIntegrations(): Integration[] {
  seed();
  return [...integrations.values()].filter((i) => i.deletedAt);
}

export function getIntegration(id: string): Integration | undefined {
  seed();
  return integrations.get(id);
}

export function findIntegrationByName(name: string): Integration | undefined {
  seed();
  return [...integrations.values()].find((i) => i.name.toLowerCase() === name.toLowerCase());
}

export type IntegrationInput = Omit<Integration, 'id' | 'createdAt' | 'updatedAt' | 'health' | 'history' | 'consecutiveFailures'>;

export function createIntegration(input: Partial<Integration>): Integration {
  seed();
  const item = normalize({ id: crypto.randomUUID(), ...input });
  integrations.set(item.id, item);
  audit('integration.create', item.id, `${item.kind}:${item.name}`, input.submittedBy ? 'public' : 'admin');
  persist();
  return item;
}

export function updateIntegration(id: string, patch: Partial<Integration>, actor = 'admin'): Integration | undefined {
  const item = integrations.get(id);
  if (!item) return undefined;
  const { id: _id, createdAt: _c, health: _h, history: _hh, builtin: _b, consecutiveFailures: _cf, deletedAt: _d, ...safe } = patch;
  // version history — snapshot before applying the change
  const { history: _drop, ...snapshot } = item;
  item.history.unshift({ at: now(), by: actor, snapshot: JSON.stringify(snapshot) });
  if (item.history.length > 10) item.history.pop();
  Object.assign(item, safe, { updatedAt: now() });
  audit('integration.update', id, Object.keys(safe).join(','), actor);
  persist();
  return item;
}

export function restoreIntegrationVersion(id: string, index: number): Integration | undefined {
  const item = integrations.get(id);
  const entry = item?.history[index];
  if (!item || !entry) return undefined;
  try {
    const snap = JSON.parse(entry.snapshot) as Partial<Integration>;
    const { id: _i, createdAt: _c, health: _h, ...safe } = snap;
    Object.assign(item, safe, { updatedAt: now() });
    audit('integration.restore-version', id, `restored snapshot from ${entry.at}`);
    persist();
    return item;
  } catch {
    return undefined;
  }
}

/** Soft delete — recoverable from the "recently deleted" section. */
export function deleteIntegration(id: string): boolean | 'builtin' {
  const item = integrations.get(id);
  if (!item || item.deletedAt) return false;
  if (item.builtin) return 'builtin';
  item.deletedAt = now();
  item.updatedAt = now();
  audit('integration.delete', id, `${item.kind}:${item.name}`);
  persist();
  return true;
}

export function restoreIntegration(id: string): boolean {
  const item = integrations.get(id);
  if (!item?.deletedAt) return false;
  item.deletedAt = undefined;
  item.updatedAt = now();
  audit('integration.restore', id, item.name);
  persist();
  return true;
}

export function purgeIntegration(id: string): boolean {
  const item = integrations.get(id);
  if (!item || !item.deletedAt || item.builtin) return false;
  integrations.delete(id);
  audit('integration.purge', id, item.name);
  persist();
  return true;
}

export function approveIntegration(id: string): Integration | undefined {
  const item = integrations.get(id);
  if (!item) return undefined;
  item.reviewState = 'approved';
  item.updatedAt = now();
  audit('integration.approve', id, item.name);
  notify('info', `Source approved: ${item.name}`);
  persist();
  return item;
}

export function rejectIntegration(id: string): Integration | undefined {
  const item = integrations.get(id);
  if (!item) return undefined;
  item.reviewState = 'rejected';
  item.enabled = false;
  item.updatedAt = now();
  audit('integration.reject', id, item.name);
  persist();
  return item;
}

/* ---------------- status ---------------- */

/** User-facing status — drives badges in admin + public directory. */
export function displayStatus(i: Integration): DisplayStatus {
  if (i.deletedAt || !i.enabled || i.reviewState === 'rejected') return 'disabled';
  if (i.reviewState === 'pending') return 'review';
  switch (i.health.status) {
    case 'healthy':
      return 'working';
    case 'degraded':
      return 'partial';
    case 'down':
      return 'offline';
    default:
      return i.health.lastError ? 'error' : 'unknown';
  }
}

/** Record the result of an integration call (health + counters). */
export function recordIntegrationEvent(id: string, ok: boolean, latencyMs?: number, error?: string): void {
  const item = integrations.get(id);
  if (!item) return;
  const h = item.health;
  const prevStatus = displayStatus(item);
  h.lastCheckAt = now();
  if (ok) {
    h.okCount++;
    h.lastOk = now();
    if (latencyMs != null) {
      h.latencyMs = Math.round(latencyMs);
      h.avgLatencyMs = h.avgLatencyMs == null ? h.latencyMs : Math.round(h.avgLatencyMs * 0.7 + latencyMs * 0.3);
    }
    h.status = h.errorCount > 5 && h.okCount < h.errorCount ? 'degraded' : 'healthy';
    item.consecutiveFailures = 0;
  } else {
    h.errorCount++;
    h.lastFail = now();
    h.lastError = error?.slice(0, 200);
    h.status = h.errorCount >= 5 ? 'down' : 'degraded';
    item.consecutiveFailures++;
  }
  item.updatedAt = now();

  const nextStatus = displayStatus(item);
  if (nextStatus !== prevStatus) {
    audit('integration.status', id, `${prevStatus} → ${nextStatus}`);
    if (nextStatus === 'offline' || nextStatus === 'error') {
      notify('error', `${item.name} is ${nextStatus}`, h.lastError);
    } else if (prevStatus === 'offline' || prevStatus === 'error') {
      notify('info', `${item.name} recovered`, `Status: ${nextStatus}`);
    }
  }

  // Auto-disable after repeated consecutive failures — never silently re-enabled.
  const AUTO_DISABLE_AFTER = 5;
  if (item.enabled && !item.autoDisabled && item.consecutiveFailures >= AUTO_DISABLE_AFTER) {
    item.enabled = false;
    item.autoDisabled = true;
    audit('integration.auto-disable', id, `${item.consecutiveFailures} consecutive failures`);
    notify('warn', `${item.name} auto-disabled`, `${item.consecutiveFailures} consecutive check failures — last error: ${h.lastError ?? 'unknown'}`);
  }
  persist();
}

/** Which integrations of a type should be tried, in priority order. */
export function enabledIntegrations(kind: IntegrationKind, type?: string): Integration[] {
  return listIntegrations(kind).filter(
    (i) => i.enabled && i.reviewState === 'approved' && (!type || i.type === type),
  );
}

/** Public directory listing — approved, enabled, non-deleted sources only. */
export function listPublicSources(): Integration[] {
  return listIntegrations().filter((i) => i.enabled && i.reviewState === 'approved');
}

/* ---------------- serializers ---------------- */

/** Never serialize credential values — only whether one is configured. */
export function toPublicIntegration(i: Integration) {
  const { credentialEnv, history, ...rest } = i;
  return {
    ...rest,
    status: displayStatus(i),
    label: CATEGORY_LABELS[i.category],
    historyCount: history.length,
    hasCredential: Boolean(credentialEnv && process.env[credentialEnv]),
    credentialEnv: credentialEnv ? maskEnvName(credentialEnv) : undefined,
  };
}

/** Curated subset for the public /sources directory — no admin internals. */
export function toPublicSource(i: Integration) {
  return {
    id: i.id,
    kind: i.kind,
    name: i.name,
    type: i.type,
    baseUrl: i.baseUrl,
    category: i.category,
    label: CATEGORY_LABELS[i.category],
    verified: i.verified,
    status: displayStatus(i),
    description: i.description,
    logoUrl: i.logoUrl,
    maintainer: i.maintainer,
    features: i.features,
    languages: i.languages,
    regions: i.regions,
    contentTypes: i.contentTypes,
    docsUrl: i.docsUrl,
    legal: i.legal,
    health: {
      latencyMs: i.health.avgLatencyMs ?? i.health.latencyMs,
      lastOk: i.health.lastOk,
      lastCheckAt: i.health.lastCheckAt,
    },
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
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
