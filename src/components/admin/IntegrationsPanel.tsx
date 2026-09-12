'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  cacheTtlSec: number;
  requestMethod: string;
  requestHeaders: Record<string, string>;
  queryParams: Record<string, string>;
  responseFormat: string;
  pagination: string;
  scope: string;
  category: string;
  label: string;
  verified: boolean;
  reviewState: 'approved' | 'pending' | 'rejected';
  submittedBy?: string;
  builtin?: boolean;
  autoDisabled?: boolean;
  description?: string;
  logoUrl?: string;
  maintainer?: string;
  features: string[];
  languages: string[];
  regions: string[];
  contentTypes: string[];
  docsUrl?: string;
  legal: { terms?: string; privacy?: string; dmca?: string };
  notes?: string;
  status: 'working' | 'partial' | 'offline' | 'error' | 'review' | 'disabled' | 'unknown';
  historyCount: number;
  health: {
    status: 'unknown' | 'healthy' | 'degraded' | 'down';
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
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  working: 'bg-success/15 text-success',
  partial: 'bg-warn/15 text-warn',
  offline: 'bg-danger/15 text-danger',
  error: 'bg-danger/15 text-danger',
  review: 'bg-rose/15 text-rose-light',
  disabled: 'bg-line/40 text-ink-muted',
  unknown: 'bg-line/40 text-ink-muted',
};

const STATUS_TEXT: Record<string, string> = {
  working: 'Working',
  partial: 'Partially working',
  offline: 'Offline',
  error: 'Error',
  review: 'Under review',
  disabled: 'Disabled',
  unknown: 'Not checked',
};

const CATEGORY_STYLE: Record<string, string> = {
  Official: 'bg-success/15 text-success',
  'Open API': 'bg-rose/15 text-rose-light',
  'Open Source': 'bg-rose/15 text-rose-light',
  Community: 'bg-warn/15 text-warn',
  'Non-Official': 'bg-danger/15 text-danger',
  Custom: 'bg-line/40 text-ink-muted',
};

const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleString() : 'never');

export function IntegrationsPanel({ kind }: { kind: 'source' | 'api' }) {
  const [items, setItems] = useState<IntegrationPublic[] | null>(null);
  const [deleted, setDeleted] = useState<IntegrationPublic[]>([]);
  const [editing, setEditing] = useState<IntegrationPublic | 'new' | null>(null);
  const [testing, setTesting] = useState<string | 'all' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'pending'>('all');

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/integrations?kind=${kind}&includeDeleted=1`, { cache: 'no-store' });
    if (!res.ok) return setItems([]);
    const data = await res.json();
    setItems(data.integrations);
    setDeleted(data.deleted ?? []);
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
      const steps = (data.result?.checks ?? [])
        .map((c: { name: string; ok: boolean; detail?: string }) => `${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
        .join(' · ');
      toast(
        data.result?.ok
          ? `${item.name}: OK (${data.result.latencyMs ?? 0}ms) ${steps}`
          : `${item.name}: ${data.result?.error ?? 'failed'} ${steps}`,
        data.result?.ok ? 'success' : 'error',
      );
      load();
    } finally {
      setTesting(null);
    }
  }

  async function testAll() {
    setTesting('all');
    try {
      const res = await fetch('/api/admin/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      toast(`Checked ${data.summary?.total ?? 0} — ${data.summary?.ok ?? 0} passed`, 'info');
      load();
    } finally {
      setTesting(null);
    }
  }

  async function patch(item: IntegrationPublic, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/integrations/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error ?? 'Update failed', 'error');
    }
    load();
    return res.ok;
  }

  async function bulk(action: string) {
    const ids = [...selected];
    if (!ids.length) return;
    const res = await fetch('/api/admin/integrations/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const okCount = (data.results ?? []).filter((r: { ok: boolean }) => r.ok).length;
      toast(`${action}: ${okCount}/${ids.length} succeeded`, 'success');
      setSelected(new Set());
      load();
    } else {
      toast(data.error ?? 'Bulk action failed', 'error');
    }
  }

  async function remove(item: IntegrationPublic) {
    if (confirmDelete !== item.id) {
      setConfirmDelete(item.id);
      setTimeout(() => setConfirmDelete(null), 4000);
      return;
    }
    const res = await fetch(`/api/admin/integrations/${item.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? `${item.name} moved to recently deleted` : d.error ?? 'Delete failed', res.ok ? 'success' : 'error');
    setConfirmDelete(null);
    load();
  }

  async function exportAll() {
    const res = await fetch('/api/admin/integrations?export=1');
    if (!res.ok) return toast('Export failed', 'error');
    const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nekomo-integrations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importFile(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const items = Array.isArray(data) ? data : data.integrations;
      const res = await fetch('/api/admin/integrations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const d = await res.json();
      toast(res.ok ? `Imported ${d.imported} integration(s)` : d.error ?? 'Import failed', res.ok ? 'success' : 'error');
      load();
    } catch {
      toast('Could not parse import file', 'error');
    }
  }

  const title = kind === 'source' ? 'Sources' : 'APIs';
  const desc =
    kind === 'source'
      ? 'Catalog, streaming, subtitle, and image providers. Enabled sources are tried in priority order; failed sources fall back automatically. Repeat failures auto-disable a source.'
      : 'Metadata and integration APIs. Disabled APIs are skipped by the provider facade.';

  const shown = (items ?? []).filter((i) => (filter === 'pending' ? i.reviewState === 'pending' : true));
  const pendingCount = (items ?? []).filter((i) => i.reviewState === 'pending').length;
  const allChecked = shown.length > 0 && shown.every((i) => selected.has(i.id));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-muted">{desc}</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={testAll} disabled={testing === 'all'} className="min-h-[40px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted hover:border-rose hover:text-ink disabled:opacity-50">
            {testing === 'all' ? 'Checking…' : `Test all ${title.toLowerCase()}`}
          </button>
          {kind === 'api' && (
            <>
              <button onClick={exportAll} className="min-h-[40px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted hover:border-rose hover:text-ink">
                Export
              </button>
              <label className="min-h-[40px] cursor-pointer rounded-xl border border-line px-4 py-2 text-sm text-ink-muted hover:border-rose hover:text-ink">
                Import
                <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
              </label>
            </>
          )}
          <button onClick={() => setEditing('new')} className="min-h-[40px] rounded-xl bg-rose px-4 py-2 text-sm font-semibold text-white hover:bg-rose-mid">
            Add {kind === 'source' ? 'source' : 'API'}
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <button
          onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
          className={cn('mb-4 w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors', filter === 'pending' ? 'border-rose bg-rose/10' : 'border-warn/40 bg-warn/5 hover:bg-warn/10')}
        >
          <span className="font-medium text-warn">{pendingCount} submission{pendingCount > 1 ? 's' : ''} awaiting review</span>
          <span className="ml-2 text-ink-muted">{filter === 'pending' ? '— showing review queue' : '— click to review'}</span>
        </button>
      )}

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card p-3">
          <span className="text-sm text-ink-muted">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {(['test', 'enable', 'disable', 'delete'] as const).map((a) => (
              <button key={a} onClick={() => bulk(a)} className={cn('min-h-[36px] rounded-lg border px-3 text-sm capitalize', a === 'delete' ? 'border-danger/40 text-danger hover:bg-danger/10' : 'border-line text-ink-muted hover:border-rose hover:text-ink')}>
                {a}
              </button>
            ))}
            <button onClick={() => setSelected(new Set())} className="min-h-[36px] rounded-lg px-3 text-sm text-ink-muted hover:text-ink">
              Clear
            </button>
          </div>
        </div>
      )}

      {items === null ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState title={filter === 'pending' ? 'Review queue is empty' : `No ${title.toLowerCase()}`} body="Add one to get started." />
      ) : (
        <ul className="space-y-3">
          <li className="flex items-center gap-3 px-1 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => setSelected(allChecked ? new Set() : new Set(shown.map((i) => i.id)))}
              aria-label="Select all"
              className="h-4 w-4 accent-rose"
            />
            Select all
          </li>
          {shown.map((i) => (
            <li key={i.id} className={cn('rounded-2xl border border-line bg-card p-4', (!i.enabled || i.reviewState !== 'approved') && 'opacity-70')}>
              <div className="flex flex-wrap items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(i.id)}
                  onChange={() => setSelected((s) => { const n = new Set(s); n.has(i.id) ? n.delete(i.id) : n.add(i.id); return n; })}
                  aria-label={`Select ${i.name}`}
                  className="mt-1.5 h-4 w-4 shrink-0 accent-rose"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-semibold">{i.name}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLE[i.status])}>
                      {STATUS_TEXT[i.status] ?? i.status}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CATEGORY_STYLE[i.label] ?? 'bg-line/40 text-ink-muted')}>
                      {i.label}
                    </span>
                    {!i.verified && <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">Unverified</span>}
                    {i.builtin && <span className="rounded-full bg-line/40 px-2 py-0.5 text-xs text-ink-muted">built-in</span>}
                    {i.autoDisabled && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">auto-disabled</span>}
                    <span className="rounded-full bg-bg-alt px-2 py-0.5 text-xs text-ink-muted">{i.type}</span>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-ink-muted">{i.baseUrl}</p>
                  {i.description && <p className="mt-1 text-xs text-ink-muted">{i.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span>priority {i.priority}</span>
                    <span>{i.health.okCount + i.health.errorCount} requests · {i.health.okCount} ok · {i.health.errorCount} failed</span>
                    {i.health.avgLatencyMs != null && <span>avg {i.health.avgLatencyMs}ms</span>}
                    {i.hasCredential && <span>auth: {i.credentialEnv ?? 'configured'}</span>}
                    {i.apiVersion && <span>v{i.apiVersion}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span>last ok: {fmtTime(i.health.lastOk)}</span>
                    <span>last fail: {fmtTime(i.health.lastFail)}</span>
                    <span>last check: {fmtTime(i.health.lastCheckAt)}</span>
                  </div>
                  {i.health.lastError && <p className="mt-1 text-xs text-danger">Last error: {i.health.lastError}</p>}
                  {i.notes && <p className="mt-1 text-xs text-ink-muted">{i.notes}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {i.reviewState === 'pending' && (
                    <>
                      <button onClick={() => patch(i, { action: 'approve' })} className="min-h-[36px] rounded-lg border border-success/40 px-3 text-sm text-success hover:bg-success/10">
                        Approve
                      </button>
                      <button onClick={() => patch(i, { action: 'reject' })} className="min-h-[36px] rounded-lg border border-danger/40 px-3 text-sm text-danger hover:bg-danger/10">
                        Reject
                      </button>
                    </>
                  )}
                  <button onClick={() => patch(i, { priority: i.priority - 1 })} aria-label={`Raise priority of ${i.name}`} className="h-9 w-9 rounded-lg border border-line text-ink-muted hover:border-rose hover:text-ink">
                    ↑
                  </button>
                  <button onClick={() => patch(i, { priority: i.priority + 1 })} aria-label={`Lower priority of ${i.name}`} className="h-9 w-9 rounded-lg border border-line text-ink-muted hover:border-rose hover:text-ink">
                    ↓
                  </button>
                  <button onClick={() => test(i)} disabled={testing === i.id} className="min-h-[36px] rounded-lg border border-line px-3 text-sm text-ink-muted hover:border-rose hover:text-ink disabled:opacity-50">
                    {testing === i.id ? 'Testing…' : `Test ${kind === 'api' ? 'API' : 'source'}`}
                  </button>
                  <button onClick={() => setEditing(i)} className="min-h-[36px] rounded-lg border border-line px-3 text-sm text-ink-muted hover:border-rose hover:text-ink">
                    Edit
                  </button>
                  <button
                    onClick={() => patch(i, { enabled: !i.enabled })}
                    className={cn('min-h-[36px] rounded-lg border px-3 text-sm', i.enabled ? 'border-warn/40 text-warn hover:bg-warn/10' : 'border-success/40 text-success hover:bg-success/10')}
                  >
                    {i.enabled ? 'Disable' : 'Enable'}
                  </button>
                  {!i.builtin && (
                    <button
                      onClick={() => remove(i)}
                      className={cn('min-h-[36px] rounded-lg border px-3 text-sm', confirmDelete === i.id ? 'border-danger bg-danger/20 text-danger' : 'border-danger/40 text-danger hover:bg-danger/10')}
                    >
                      {confirmDelete === i.id ? 'Confirm delete?' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleted.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Recently deleted
          </h3>
          <ul className="space-y-2">
            {deleted.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card/50 px-4 py-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{i.name}</span>
                  <span className="ml-2 text-xs text-ink-muted">deleted {fmtTime(i.deletedAt)}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => patch(i, { action: 'restore' })} className="min-h-[36px] rounded-lg border border-success/40 px-3 text-sm text-success hover:bg-success/10">
                    Restore
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Permanently delete ${i.name}?`)) return;
                      await fetch(`/api/admin/integrations/${i.id}?hard=1`, { method: 'DELETE' });
                      load();
                    }}
                    className="min-h-[36px] rounded-lg border border-danger/40 px-3 text-sm text-danger hover:bg-danger/10"
                  >
                    Delete forever
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <IntegrationForm
          kind={kind}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </section>
  );
}

/* ---------------- Add / edit form (autosaving) ---------------- */

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
    credentialEnv: '',
    enabled: item?.enabled ?? true,
    priority: item?.priority ?? 5,
    timeoutMs: item?.timeoutMs ?? 10_000,
    retries: item?.retries ?? 2,
    rateLimitPerMin: item?.rateLimitPerMin ?? 60,
    cacheTtlSec: item?.cacheTtlSec ?? 300,
    requestMethod: item?.requestMethod ?? 'GET',
    responseFormat: item?.responseFormat ?? 'any',
    pagination: item?.pagination ?? 'none',
    scope: item?.scope ?? 'public',
    category: item?.category ?? 'community',
    verified: item?.verified ?? false,
    description: item?.description ?? '',
    logoUrl: item?.logoUrl ?? '',
    maintainer: item?.maintainer ?? '',
    features: (item?.features ?? []).join(', '),
    languages: (item?.languages ?? []).join(', '),
    regions: (item?.regions ?? []).join(', '),
    contentTypes: (item?.contentTypes ?? []).join(', '),
    docsUrl: item?.docsUrl ?? '',
    termsUrl: item?.legal?.terms ?? '',
    privacyUrl: item?.legal?.privacy ?? '',
    dmcaUrl: item?.legal?.dmca ?? '',
    requestHeaders: mapToLines(item?.requestHeaders),
    queryParams: mapToLines(item?.queryParams),
    notes: item?.notes ?? '',
  });
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const historyCount = item?.historyCount ?? 0;
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const set = (k: string, v: unknown) => {
    dirty.current = true;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const payload = () => ({
    ...form,
    kind,
    priority: Number(form.priority),
    timeoutMs: Number(form.timeoutMs),
    retries: Number(form.retries),
    rateLimitPerMin: Number(form.rateLimitPerMin),
    cacheTtlSec: Number(form.cacheTtlSec),
    languages: csv(form.languages),
    regions: csv(form.regions),
    features: csv(form.features),
    contentTypes: csv(form.contentTypes),
    requestHeaders: linesToMap(form.requestHeaders),
    queryParams: linesToMap(form.queryParams),
    legal: { terms: form.termsUrl || undefined, privacy: form.privacyUrl || undefined, dmca: form.dmcaUrl || undefined },
    ...(form.credentialEnv ? { credentialEnv: form.credentialEnv } : {}),
  });

  const valid = () => form.name.trim().length > 0 && form.baseUrl.trim().length > 0;

  /** Autosave (existing items only) — debounced 800ms after last change. */
  const scheduleSave = useCallback(() => {
    if (!item) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!valid()) return;
      setSaveState('saving');
      const res = await fetch(`/api/admin/integrations/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      });
      if (res.ok) {
        dirty.current = false;
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
        onSaved();
      } else {
        const d = await res.json().catch(() => ({}));
        setSaveState('error');
        setError(d.error ?? 'Autosave failed');
      }
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, form]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (item) {
      onClose();
      return;
    }
    setSaveState('saving');
    setError('');
    const res = await fetch('/api/admin/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    });
    const data = await res.json().catch(() => ({}));
    setSaveState('idle');
    if (!res.ok) {
      setError(data.error ?? 'Save failed');
      return;
    }
    dirty.current = false;
    toast('Added', 'success');
    onSaved();
    onClose();
  }

  const restoreVersion = async (index: number) => {
    if (!item) return;
    const res = await fetch(`/api/admin/integrations/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore-version', index }),
    });
    toast(res.ok ? 'Version restored' : 'Restore failed', res.ok ? 'success' : 'error');
    if (res.ok) onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={item ? `Edit ${item.name}` : 'Add integration'}>
      <form
        onSubmit={submit}
        onChange={scheduleSave}
        className="safe-b max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-bg-alt p-5 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">
            {item ? `Edit ${item.name}` : `Add ${kind}`}
          </h2>
          {item && (
            <span className={cn('text-xs', saveState === 'error' ? 'text-danger' : 'text-ink-muted')} role="status" aria-live="polite">
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState === 'error' ? 'Save failed' : 'Autosaves as you type'}
            </span>
          )}
        </div>

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
          <Field label="Category">
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inp}>
              {['official', 'open-api', 'open-source', 'community', 'non-official', 'custom'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Scope">
            <select value={form.scope} onChange={(e) => set('scope', e.target.value)} className={inp}>
              {['public', 'private', 'local', 'self-hosted'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Auth method">
            <select value={form.authMethod} onChange={(e) => set('authMethod', e.target.value)} className={inp}>
              {['none', 'api-key', 'bearer', 'oauth', 'custom'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Credential env var" hint={item?.hasCredential ? `Currently: ${item.credentialEnv}` : undefined}>
            <input value={form.credentialEnv} onChange={(e) => set('credentialEnv', e.target.value)} placeholder="e.g. JIKAN_API_KEY" className={inp} />
            <p className="mt-1 text-xs text-ink-muted">Name of an environment variable holding the secret — replace by entering a new name. The value is never sent to the browser.</p>
          </Field>
          <Field label="API version">
            <input value={form.apiVersion} onChange={(e) => set('apiVersion', e.target.value)} className={inp} />
          </Field>
          <Field label="Request method">
            <select value={form.requestMethod} onChange={(e) => set('requestMethod', e.target.value)} className={inp}>
              {['GET', 'HEAD'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Response format">
            <select value={form.responseFormat} onChange={(e) => set('responseFormat', e.target.value)} className={inp}>
              {['any', 'json', 'html'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Pagination">
            <select value={form.pagination} onChange={(e) => set('pagination', e.target.value)} className={inp}>
              {['none', 'page', 'offset', 'cursor'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
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
          <Field label="Cache TTL (sec)">
            <input type="number" min={0} max={86400} value={form.cacheTtlSec} onChange={(e) => set('cacheTtlSec', e.target.value)} className={inp} />
          </Field>
          <Field label="Default headers (one per line: Key: value)" className="sm:col-span-2">
            <textarea value={form.requestHeaders} onChange={(e) => set('requestHeaders', e.target.value)} rows={2} placeholder={'Accept-Language: en'} className={inp} />
          </Field>
          <Field label="Query params (one per line: key=value)" className="sm:col-span-2">
            <textarea value={form.queryParams} onChange={(e) => set('queryParams', e.target.value)} rows={2} className={inp} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className={inp} />
          </Field>
          <Field label="Logo URL">
            <input value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} className={inp} />
          </Field>
          <Field label="Provider / maintainer">
            <input value={form.maintainer} onChange={(e) => set('maintainer', e.target.value)} className={inp} />
          </Field>
          <Field label="Features enabled (comma-separated)" className="sm:col-span-2">
            <input value={form.features} onChange={(e) => set('features', e.target.value)} placeholder="search, metadata, images, episodes, streaming" className={inp} />
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
          <Field label="Documentation URL">
            <input value={form.docsUrl} onChange={(e) => set('docsUrl', e.target.value)} className={inp} />
          </Field>
          <Field label="Terms of use URL">
            <input value={form.termsUrl} onChange={(e) => set('termsUrl', e.target.value)} className={inp} />
          </Field>
          <Field label="Privacy policy URL">
            <input value={form.privacyUrl} onChange={(e) => set('privacyUrl', e.target.value)} className={inp} />
          </Field>
          <Field label="DMCA / copyright URL">
            <input value={form.dmcaUrl} onChange={(e) => set('dmcaUrl', e.target.value)} className={inp} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={inp} />
          </Field>
          <label className="flex min-h-[44px] items-center gap-3 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="h-4 w-4 accent-rose" />
            Enabled
          </label>
          {form.category === 'official' && (
            <label className="flex min-h-[44px] items-center gap-3 text-sm">
              <input type="checkbox" checked={form.verified} onChange={(e) => set('verified', e.target.checked)} className="h-4 w-4 accent-rose" />
              Verified (licensing confirmed)
            </label>
          )}
        </div>

        {historyCount > 0 && (
          <details className="mt-4 rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-xs font-medium text-ink-muted">Version history ({historyCount})</summary>
            <ul className="mt-2 space-y-1">
              {Array.from({ length: historyCount }, (_, idx) => (
                <li key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Snapshot {idx + 1} (most recent first)</span>
                  <button type="button" onClick={() => restoreVersion(idx)} className="rounded border border-line px-2 py-1 text-ink-muted hover:border-rose hover:text-ink">
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-line px-4 py-2 text-sm text-ink-muted hover:text-ink">
            {item ? 'Close' : 'Cancel'}
          </button>
          {!item && (
            <button type="submit" disabled={saveState === 'saving' || !valid()} className="min-h-[44px] rounded-xl bg-rose px-5 py-2 text-sm font-semibold text-white hover:bg-rose-mid disabled:opacity-60">
              {saveState === 'saving' ? 'Saving…' : 'Add'}
            </button>
          )}
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

function mapToLines(m?: Record<string, string>): string {
  return Object.entries(m ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n');
}

function linesToMap(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of s.split('\n')) {
    const sep = line.includes(':') ? ':' : '=';
    const idx = line.indexOf(sep);
    if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}
