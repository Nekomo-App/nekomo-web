'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/Toaster';
import { EmptyState } from '@/components/admin/AdminDashboard';

export interface IntegrationPublic {
  id: string;
  kind: 'source' | 'api';
  name: string;
  type: string;
  baseUrl: string;
  apiVersion?: string;
  authMethod: string;
  credentialEnv?: string;
  hasCredential: boolean;
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
    status: 'unknown' | 'healthy' | 'degraded' | 'down';
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

const STATUS_STYLE: Record<string, string> = {
  healthy: 'bg-success/15 text-success',
  degraded: 'bg-warn/15 text-warn',
  down: 'bg-danger/15 text-danger',
  unknown: 'bg-line/40 text-ink-muted',
};

export function IntegrationsPanel({ kind }: { kind: 'source' | 'api' }) {
  const [items, setItems] = useState<IntegrationPublic[] | null>(null);
  const [editing, setEditing] = useState<IntegrationPublic | 'new' | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/integrations?kind=${kind}`, { cache: 'no-store' });
    setItems(res.ok ? (await res.json()).integrations : []);
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  async function test(item: IntegrationPublic) {
    setTesting(item.id);
    try {
      const res = await fetch('/api/admin/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();
      toast(
        data.result?.ok
          ? `${item.name}: OK (${data.result.latencyMs ?? 0}ms)`
          : `${item.name}: ${data.result?.error ?? 'failed'}`,
        data.result?.ok ? 'success' : 'error',
      );
      load();
    } finally {
      setTesting(null);
    }
  }

  async function toggle(item: IntegrationPublic) {
    const res = await fetch(`/api/admin/integrations/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    toast(res.ok ? `${item.name} ${item.enabled ? 'disabled' : 'enabled'}` : 'Update failed', res.ok ? 'success' : 'error');
    load();
  }

  async function reorder(item: IntegrationPublic, dir: -1 | 1) {
    await fetch(`/api/admin/integrations/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: item.priority + dir }),
    });
    load();
  }

  async function remove(item: IntegrationPublic) {
    if (confirmDelete !== item.id) {
      setConfirmDelete(item.id);
      setTimeout(() => setConfirmDelete(null), 4000);
      return;
    }
    const res = await fetch(`/api/admin/integrations/${item.id}`, { method: 'DELETE' });
    toast(res.ok ? `${item.name} removed` : 'Delete failed', res.ok ? 'success' : 'error');
    setConfirmDelete(null);
    load();
  }

  const title = kind === 'source' ? 'Sources' : 'APIs';
  const desc =
    kind === 'source'
      ? 'Catalog, streaming, subtitle, and image providers. Enabled sources are tried in priority order; failed sources fall back automatically.'
      : 'Metadata and integration APIs. Disabled APIs are skipped by the provider facade.';

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-muted">{desc}</p>
        <button
          onClick={() => setEditing('new')}
          className="min-h-[40px] rounded-xl bg-rose px-4 py-2 text-sm font-semibold text-white hover:bg-rose-mid"
        >
          Add {kind === 'source' ? 'source' : 'API'}
        </button>
      </div>

      {items === null ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()}`} body="Add one to get started." />
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className={cn('rounded-2xl border border-line bg-card p-4', !i.enabled && 'opacity-60')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-semibold">{i.name}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLE[i.health.status])}>
                      {i.health.status}
                    </span>
                    {!i.enabled && (
                      <span className="rounded-full bg-line/40 px-2 py-0.5 text-xs text-ink-muted">disabled</span>
                    )}
                    <span className="rounded-full bg-bg-alt px-2 py-0.5 text-xs text-ink-muted">{i.type}</span>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-ink-muted">{i.baseUrl}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span>priority {i.priority}</span>
                    <span>timeout {i.timeoutMs}ms</span>
                    <span>{i.rateLimitPerMin}/min</span>
                    <span>{i.health.okCount} ok · {i.health.errorCount} errors</span>
                    {i.health.latencyMs != null && <span>{i.health.latencyMs}ms</span>}
                    {i.hasCredential && <span>auth: {i.credentialEnv ?? 'configured'}</span>}
                    {i.apiVersion && <span>v{i.apiVersion}</span>}
                  </div>
                  {i.health.lastError && (
                    <p className="mt-1 text-xs text-danger">Last error: {i.health.lastError}</p>
                  )}
                  {i.notes && <p className="mt-1 text-xs text-ink-muted">{i.notes}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => reorder(i, -1)}
                    aria-label={`Raise priority of ${i.name}`}
                    className="h-9 w-9 rounded-lg border border-line text-ink-muted hover:border-rose hover:text-ink"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => reorder(i, 1)}
                    aria-label={`Lower priority of ${i.name}`}
                    className="h-9 w-9 rounded-lg border border-line text-ink-muted hover:border-rose hover:text-ink"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => test(i)}
                    disabled={testing === i.id}
                    className="min-h-[36px] rounded-lg border border-line px-3 text-sm text-ink-muted hover:border-rose hover:text-ink disabled:opacity-50"
                  >
                    {testing === i.id ? 'Testing…' : 'Test'}
                  </button>
                  <button
                    onClick={() => setEditing(i)}
                    className="min-h-[36px] rounded-lg border border-line px-3 text-sm text-ink-muted hover:border-rose hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggle(i)}
                    className={cn(
                      'min-h-[36px] rounded-lg border px-3 text-sm',
                      i.enabled
                        ? 'border-warn/40 text-warn hover:bg-warn/10'
                        : 'border-success/40 text-success hover:bg-success/10',
                    )}
                  >
                    {i.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => remove(i)}
                    className={cn(
                      'min-h-[36px] rounded-lg border px-3 text-sm',
                      confirmDelete === i.id
                        ? 'border-danger bg-danger/20 text-danger'
                        : 'border-danger/40 text-danger hover:bg-danger/10',
                    )}
                  >
                    {confirmDelete === i.id ? 'Confirm delete?' : 'Delete'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <IntegrationForm
          kind={kind}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </section>
  );
}

/* ---------------- Add / edit form ---------------- */

function IntegrationForm({
  kind,
  item,
  onClose,
  onSaved,
}: {
  kind: 'source' | 'api';
  item: IntegrationPublic | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    type: item?.type ?? (kind === 'source' ? 'catalog' : 'metadata'),
    baseUrl: item?.baseUrl ?? '',
    apiVersion: item?.apiVersion ?? '',
    authMethod: item?.authMethod ?? 'none',
    credentialEnv: item?.hasCredential ? '' : '', // never prefill a credential
    enabled: item?.enabled ?? true,
    priority: item?.priority ?? 5,
    timeoutMs: item?.timeoutMs ?? 10_000,
    retries: item?.retries ?? 2,
    rateLimitPerMin: item?.rateLimitPerMin ?? 60,
    languages: (item?.languages ?? []).join(', '),
    regions: (item?.regions ?? []).join(', '),
    contentTypes: (item?.contentTypes ?? []).join(', '),
    docsUrl: item?.docsUrl ?? '',
    notes: item?.notes ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const payload = {
      ...form,
      kind,
      priority: Number(form.priority),
      timeoutMs: Number(form.timeoutMs),
      retries: Number(form.retries),
      rateLimitPerMin: Number(form.rateLimitPerMin),
      languages: csv(form.languages),
      regions: csv(form.regions),
      contentTypes: csv(form.contentTypes),
      ...(form.credentialEnv ? { credentialEnv: form.credentialEnv } : {}),
    };
    const res = item
      ? await fetch(`/api/admin/integrations/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/admin/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? 'Save failed');
      return;
    }
    toast(item ? 'Saved' : 'Added', 'success');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={item ? `Edit ${item.name}` : 'Add integration'}>
      <form
        onSubmit={submit}
        className="safe-b max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-bg-alt p-5 sm:rounded-2xl"
      >
        <h2 className="font-display text-lg font-bold">
          {item ? `Edit ${item.name}` : `Add ${kind}`}
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name *">
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inp} />
          </Field>
          <Field label="Type">
            <input value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="metadata / catalog / streaming…" className={inp} />
          </Field>
          <Field label="Base URL *" className="sm:col-span-2">
            <input required value={form.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} placeholder="https://api.example.com/v1" className={inp} />
            <p className="mt-1 text-xs text-ink-muted">HTTPS only in production. Private/internal addresses are rejected (SSRF protection).</p>
          </Field>
          <Field label="Auth method">
            <select value={form.authMethod} onChange={(e) => set('authMethod', e.target.value)} className={inp}>
              {['none', 'api-key', 'bearer', 'oauth', 'custom'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Credential env var" hint={item?.hasCredential ? `Currently: ${item.credentialEnv}` : undefined}>
            <input value={form.credentialEnv} onChange={(e) => set('credentialEnv', e.target.value)} placeholder="e.g. JIKAN_API_KEY" className={inp} />
            <p className="mt-1 text-xs text-ink-muted">
              Name of an environment variable holding the secret. The value is never sent to the browser.
            </p>
          </Field>
          <Field label="API version">
            <input value={form.apiVersion} onChange={(e) => set('apiVersion', e.target.value)} className={inp} />
          </Field>
          <Field label="Priority (lower = tried first)">
            <input type="number" min={1} max={99} value={form.priority} onChange={(e) => set('priority', e.target.value)} className={inp} />
          </Field>
          <Field label="Timeout (ms)">
            <input type="number" min={500} max={60000} value={form.timeoutMs} onChange={(e) => set('timeoutMs', e.target.value)} className={inp} />
          </Field>
          <Field label="Retries">
            <input type="number" min={0} max={5} value={form.retries} onChange={(e) => set('retries', e.target.value)} className={inp} />
          </Field>
          <Field label="Rate limit (req/min)">
            <input type="number" min={1} max={600} value={form.rateLimitPerMin} onChange={(e) => set('rateLimitPerMin', e.target.value)} className={inp} />
          </Field>
          <Field label="Languages (comma-separated)">
            <input value={form.languages} onChange={(e) => set('languages', e.target.value)} placeholder="en, ja" className={inp} />
          </Field>
          <Field label="Regions (comma-separated)">
            <input value={form.regions} onChange={(e) => set('regions', e.target.value)} placeholder="US, JP" className={inp} />
          </Field>
          <Field label="Content types (comma-separated)" className="sm:col-span-2">
            <input value={form.contentTypes} onChange={(e) => set('contentTypes', e.target.value)} placeholder="video, subtitles" className={inp} />
          </Field>
          <Field label="Documentation URL" className="sm:col-span-2">
            <input value={form.docsUrl} onChange={(e) => set('docsUrl', e.target.value)} className={inp} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={inp} />
          </Field>
          <label className="flex min-h-[44px] items-center gap-3 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="h-4 w-4 accent-rose" />
            Enabled
          </label>
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted hover:text-ink">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="min-h-[44px] rounded-xl bg-rose px-5 py-2 text-sm font-semibold text-white hover:bg-rose-mid disabled:opacity-60">
            {busy ? 'Saving…' : item ? 'Save changes' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inp =
  'min-h-[40px] w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-ink-muted/60 focus:border-rose';

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block text-sm', className)}>
      <span className="mb-1 block text-xs font-medium text-ink-muted">
        {label}
        {hint && <span className="ml-1 font-normal">({hint})</span>}
      </span>
      {children}
    </label>
  );
}

function csv(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}
