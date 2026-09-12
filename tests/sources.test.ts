import { describe, expect, it } from 'vitest';
import {
  approveIntegration,
  createIntegration,
  deleteIntegration,
  displayStatus,
  getIntegration,
  listNotifications,
  listPublicSources,
  purgeIntegration,
  recordIntegrationEvent,
  rejectIntegration,
  restoreIntegration,
  restoreIntegrationVersion,
  toPublicIntegration,
  toPublicSource,
  updateIntegration,
  type Integration,
} from '@/lib/admin/store';
import { checkIntegration } from '@/lib/admin/checks';

const mkSource = (patch: Partial<Integration> = {}) =>
  createIntegration({
    kind: 'source',
    name: `Test-${Math.random().toString(36).slice(2, 7)}`,
    type: 'catalog',
    baseUrl: 'https://93.184.216.34', // literal public IP — skips DNS in SSRF validation
    reviewState: 'approved',
    enabled: true,
    ...patch,
  });

describe('source status model', () => {
  it('maps health + flags to display statuses', () => {
    const i = mkSource();
    expect(displayStatus(i)).toBe('unknown');

    i.health.status = 'healthy';
    expect(displayStatus(i)).toBe('working');

    i.health.status = 'degraded';
    expect(displayStatus(i)).toBe('partial');

    i.health.status = 'down';
    expect(displayStatus(i)).toBe('offline');

    i.reviewState = 'pending';
    expect(displayStatus(i)).toBe('review');

    i.reviewState = 'approved';
    i.enabled = false;
    expect(displayStatus(i)).toBe('disabled');
  });

  it('keeps pending/rejected sources out of the public directory', () => {
    const pending = mkSource({ reviewState: 'pending', submittedBy: 'public' });
    const approved = mkSource();
    const rejected = mkSource({ reviewState: 'rejected' });
    const disabled = mkSource({ enabled: false });

    const ids = listPublicSources().map((s) => s.id);
    expect(ids).toContain(approved.id);
    expect(ids).not.toContain(pending.id);
    expect(ids).not.toContain(rejected.id);
    expect(ids).not.toContain(disabled.id);
  });

  it('approve makes a submitted source eligible; reject disables it', () => {
    const s = mkSource({ reviewState: 'pending', enabled: false, submittedBy: 'public' });
    expect(listPublicSources().map((x) => x.id)).not.toContain(s.id);

    approveIntegration(s.id);
    updateIntegration(s.id, { enabled: true });
    expect(listPublicSources().map((x) => x.id)).toContain(s.id);

    rejectIntegration(s.id);
    const after = getIntegration(s.id)!;
    expect(after.reviewState).toBe('rejected');
    expect(after.enabled).toBe(false);
    expect(listPublicSources().map((x) => x.id)).not.toContain(s.id);
  });
});

describe('failure handling', () => {
  it('auto-disables after repeated consecutive failures and notifies admins', () => {
    const s = mkSource();
    for (let i = 0; i < 5; i++) recordIntegrationEvent(s.id, false, 100, 'boom');

    const after = getIntegration(s.id)!;
    expect(after.enabled).toBe(false);
    expect(after.autoDisabled).toBe(true);
    expect(after.health.lastError).toBe('boom');
    expect(after.health.lastFail).toBeTruthy();
    expect(listNotifications().some((n) => n.title.includes('auto-disabled'))).toBe(true);
  });

  it('recovers status on success and records last ok time', () => {
    const s = mkSource();
    recordIntegrationEvent(s.id, false, 50, 'x');
    recordIntegrationEvent(s.id, true, 120);
    const after = getIntegration(s.id)!;
    expect(after.consecutiveFailures).toBe(0);
    expect(after.health.lastOk).toBeTruthy();
    expect(after.health.avgLatencyMs).toBe(120);
    expect(displayStatus(after)).toBe('working');
  });
});

describe('deletion + history', () => {
  it('soft-deletes and restores', () => {
    const s = mkSource();
    expect(deleteIntegration(s.id)).toBe(true);
    expect(listPublicSources().map((x) => x.id)).not.toContain(s.id);
    expect(restoreIntegration(s.id)).toBe(true);
    expect(getIntegration(s.id)!.deletedAt).toBeUndefined();
  });

  it('never deletes built-in integrations', () => {
    expect(deleteIntegration('jikan')).toBe('builtin');
    expect(getIntegration('jikan')).toBeTruthy();
  });

  it('purges only soft-deleted items', () => {
    const s = mkSource();
    expect(purgeIntegration(s.id)).toBe(false); // not deleted yet
    deleteIntegration(s.id);
    expect(purgeIntegration(s.id)).toBe(true);
    expect(getIntegration(s.id)).toBeUndefined();
  });

  it('keeps version snapshots and restores them', () => {
    const s = mkSource({ name: 'Versioned' });
    updateIntegration(s.id, { name: 'Renamed' });
    const item = getIntegration(s.id)!;
    expect(item.name).toBe('Renamed');
    expect(item.history.length).toBe(1);

    restoreIntegrationVersion(s.id, 0);
    expect(getIntegration(s.id)!.name).toBe('Versioned');
  });
});

describe('serialization', () => {
  it('admin output never exposes credential values', () => {
    const s = mkSource({ credentialEnv: 'DEFINITELY_MISSING_ENV_VAR_XYZ' });
    const pub = toPublicIntegration(s);
    expect(pub.hasCredential).toBe(false);
    expect(pub.credentialEnv).toContain('•••');
    expect(JSON.stringify(pub)).not.toContain('DEFINITELY_MISSING_ENV_VAR_XYZ');
  });

  it('public source output omits admin internals', () => {
    const s = mkSource({ notes: 'admin-only note', credentialEnv: 'SOME_KEY' });
    const pub = toPublicSource(s);
    const str = JSON.stringify(pub);
    expect(str).not.toContain('admin-only note');
    expect(str).not.toContain('SOME_KEY');
    expect(pub.label).toBeTruthy();
    expect(pub.status).toBeTruthy();
  });
});

describe('health checks', () => {
  const fakeJson = () => new Response('{"ok":true}', { status: 200 });
  const fakeFail = () => Promise.reject(new Error('connect ECONNREFUSED'));

  it('passes url + connection + format steps on success', async () => {
    const s = mkSource({ responseFormat: 'json' });
    const r = await checkIntegration(s, async () => fakeJson());
    expect(r.ok).toBe(true);
    expect(r.checks.map((c) => c.name)).toEqual(['url', 'connection', 'response', 'format']);
    expect(r.checks.every((c) => c.ok)).toBe(true);
  });

  it('retries transient failures before giving up', async () => {
    const s = mkSource({ retries: 2 });
    let calls = 0;
    const r = await checkIntegration(s, async () => {
      calls++;
      if (calls < 3) return fakeFail();
      return fakeJson();
    });
    expect(calls).toBe(3);
    expect(r.ok).toBe(true);
  });

  it('marks 5xx responses as failures', async () => {
    const s = mkSource({ retries: 0 });
    const r = await checkIntegration(s, async () => new Response('oops', { status: 503 }));
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.name === 'connection')?.detail).toContain('503');
  });

  it('flags invalid JSON when json format is expected', async () => {
    const s = mkSource({ responseFormat: 'json', retries: 0 });
    const r = await checkIntegration(s, async () => new Response('<html>not json</html>', { status: 200 }));
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.name === 'format')?.ok).toBe(false);
  });

  it('records check results on the integration', async () => {
    const s = mkSource({ retries: 0 });
    await checkIntegration(s, fakeFail);
    const after = getIntegration(s.id)!;
    expect(after.health.lastCheckAt).toBeTruthy();
    expect(after.health.lastFail).toBeTruthy();
    expect(after.health.lastError).toBeTruthy();
    expect(after.consecutiveFailures).toBe(1);
  });
});
