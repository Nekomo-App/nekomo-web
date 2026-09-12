/**
 * Integration health checks.
 *
 * Every check runs the same steps — URL validity, connectivity (with
 * retries for transient failures), response sanity, and response-format
 * validation — and records the outcome on the integration's health record.
 * Repeated consecutive failures auto-disable the integration and notify
 * admins; recovery is never automatic for auto-disabled items.
 */

import { validateExternalUrl } from '@/lib/ssrf';
import { sleep } from '@/lib/utils';
import {
  audit,
  displayStatus,
  getIntegration,
  listIntegrations,
  recordIntegrationEvent,
  type DisplayStatus,
  type Integration,
} from './store';

const MAX_RESPONSE_BYTES = 256 * 1024;

export interface CheckStep {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface CheckResult {
  ok: boolean;
  status: DisplayStatus;
  latencyMs?: number;
  error?: string;
  checks: CheckStep[];
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Run the full check suite against one integration. */
export async function checkIntegration(item: Integration, fetchImpl: FetchLike = fetch): Promise<CheckResult> {
  const checks: CheckStep[] = [];

  // Built-ins are always considered working.
  if (item.baseUrl.startsWith('internal://')) {
    checks.push({ name: 'internal', ok: true, detail: 'Built-in integration' });
    recordCheck(item, true, 0);
    return { ok: true, status: displayStatus(item), checks };
  }

  // 1. URL validity (incl. SSRF rules)
  const v = await validateExternalUrl(item.baseUrl);
  checks.push({ name: 'url', ok: v.ok, detail: v.ok ? item.baseUrl : v.error });
  if (!v.ok) {
    recordCheck(item, false, undefined, v.error);
    return { ok: false, status: displayStatus(item), error: v.error, checks };
  }

  // 2. Connectivity — retry transient failures per the integration's settings
  const timeoutMs = Math.min(Math.max(item.timeoutMs || 10_000, 1000), 15_000);
  const attempts = 1 + Math.min(item.retries ?? 0, 3);
  const url = urlWithParams(v.url!, item.queryParams);
  let res: Response | null = null;
  let lastErr: unknown;
  let latencyMs = 0;
  let attempt = 0;

  for (; attempt < attempts; attempt++) {
    const started = Date.now();
    try {
      res = await fetchImpl(url, {
        method: item.requestMethod === 'HEAD' ? 'HEAD' : 'GET',
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'manual',
        headers: requestHeaders(item),
      });
      latencyMs = Date.now() - started;
      // retryable statuses
      if (res.status === 429 || res.status >= 500) {
        lastErr = `HTTP ${res.status}`;
        res = null;
        if (attempt < attempts - 1) await sleep(400 * (attempt + 1));
        continue;
      }
      break;
    } catch (e) {
      lastErr = e;
      latencyMs = Date.now() - started;
      if (attempt < attempts - 1) await sleep(400 * (attempt + 1));
    }
  }

  if (!res) {
    const raw = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'Connection failed');
    const detail = raw.includes('Timeout') ? 'Timed out' : raw.slice(0, 120);
    checks.push({ name: 'connection', ok: false, detail: `${detail} (${attempts} attempt${attempts > 1 ? 's' : ''})` });
    recordCheck(item, false, latencyMs, detail);
    return { ok: false, status: displayStatus(item), error: detail, checks };
  }

  checks.push({ name: 'connection', ok: true, detail: `HTTP ${res.status} · ${latencyMs}ms${attempt > 0 ? ` · ${attempt + 1} attempts` : ''}` });

  // 3. Response sanity + format
  let bytes = 0;
  let bodyText = '';
  try {
    const reader = res.body?.getReader();
    if (reader) {
      const chunks: Uint8Array[] = [];
      while (bytes < MAX_RESPONSE_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        chunks.push(value);
      }
      await reader.cancel().catch(() => {});
      bodyText = new TextDecoder().decode(concat(chunks)).slice(0, 64 * 1024);
    }
  } catch {
    // body unreadable — still counts as reachable
  }
  checks.push({ name: 'response', ok: true, detail: `${bytes} bytes` });

  let formatOk = true;
  let formatDetail = 'not required';
  if (item.responseFormat === 'json') {
    try {
      JSON.parse(bodyText);
      formatDetail = 'valid JSON';
    } catch {
      formatOk = res.status >= 400; // error responses may not be JSON — tolerate
      formatDetail = formatOk ? 'non-JSON error body' : 'invalid JSON';
    }
  }
  checks.push({ name: 'format', ok: formatOk, detail: formatDetail });

  const reachable = res.status < 500 && res.status !== 429;
  const ok = reachable && formatOk;
  const errDetail = !reachable
    ? `HTTP ${res.status}`
    : !formatOk
      ? 'Invalid response format'
      : undefined;
  recordCheck(item, ok, latencyMs, errDetail);
  return { ok, status: displayStatus(item), latencyMs, error: errDetail, checks };
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

function urlWithParams(url: URL, params?: Record<string, string>): string {
  const u = new URL(url.toString());
  for (const [k, val] of Object.entries(params ?? {})) u.searchParams.set(k, val);
  return u.toString();
}

function requestHeaders(item: Integration): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: item.responseFormat === 'json' ? 'application/json' : '*/*',
    'User-Agent': 'Nekomo/0.1 (source health check)',
    ...item.requestHeaders,
  };
  const secret = item.credentialEnv ? process.env[item.credentialEnv] : undefined;
  if (secret) {
    switch (item.authMethod) {
      case 'bearer':
        headers.authorization = `Bearer ${secret}`;
        break;
      case 'api-key':
        headers['x-api-key'] = secret;
        break;
    }
  }
  return headers;
}

/** Record a check outcome + refresh lastCheckAt. */
function recordCheck(item: Integration, ok: boolean, latencyMs?: number, error?: string): void {
  recordIntegrationEvent(item.id, ok, latencyMs, error);
  const fresh = getIntegration(item.id);
  if (fresh) fresh.health.lastCheckAt = new Date().toISOString();
}

/** Check every non-deleted integration. Returns per-item results. */
export async function checkAllIntegrations(opts?: { includeDisabled?: boolean }): Promise<{ id: string; name: string; result: CheckResult }[]> {
  const items = listIntegrations().filter((i) => opts?.includeDisabled || (i.enabled && i.reviewState === 'approved'));
  const out: { id: string; name: string; result: CheckResult }[] = [];
  // sequential — stays friendly to rate limits
  for (const i of items) {
    try {
      out.push({ id: i.id, name: i.name, result: await checkIntegration(i) });
    } catch (e) {
      recordCheck(i, false, undefined, e instanceof Error ? e.message : 'check failed');
      out.push({ id: i.id, name: i.name, result: { ok: false, status: displayStatus(i), error: 'Check crashed', checks: [] } });
    }
  }
  audit('integrations.check-all', undefined, `${out.length} checked, ${out.filter((r) => !r.result.ok).length} failed`);
  return out;
}

/* ---------------- scheduled checks ---------------- */

let schedulerStarted = false;

/**
 * Start periodic source checks on long-lived servers (dev / self-hosted).
 * Interval comes from SOURCE_CHECK_INTERVAL_MIN (minutes; 0 = off).
 * On serverless, schedule `POST /api/admin/checks` via cron instead.
 */
export function startSourceScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const min = Number(process.env.SOURCE_CHECK_INTERVAL_MIN ?? 0);
  if (!Number.isFinite(min) || min <= 0) return;
  const t = setInterval(() => {
    checkAllIntegrations().catch(() => {});
  }, min * 60_000);
  t.unref?.();
  audit('scheduler.start', undefined, `source checks every ${min}min`);
}
