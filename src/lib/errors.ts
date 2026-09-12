// Server-side error log — an in-memory ring buffer of recent application
// errors (provider failures, client-reported errors, API failures).
// Process-local on serverless; a production deployment should forward to a
// real observability service or persist via DATABASE_URL.

export interface ErrorEntry {
  id: string;
  at: string;
  /** Where it came from: 'provider' | 'client' | 'api' | 'admin'. */
  source: string;
  /** Optional context like 'search' or 'details:1535'. */
  context?: string;
  message: string;
  /** HTTP status or provider status when known. */
  status?: number;
  /** Page or endpoint it happened on (client reports only). */
  url?: string;
}

const MAX_ENTRIES = 200;
const entries: ErrorEntry[] = [];
let seq = 0;

export function recordError(e: Omit<ErrorEntry, 'id' | 'at'>): ErrorEntry {
  const entry: ErrorEntry = {
    ...e,
    message: e.message.slice(0, 500),
    context: e.context?.slice(0, 120),
    url: e.url?.slice(0, 300),
    id: `err-${Date.now().toString(36)}-${(seq++).toString(36)}`,
    at: new Date().toISOString(),
  };
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  return entry;
}

export function getErrors(): ErrorEntry[] {
  return [...entries];
}

export function clearErrors(): void {
  entries.length = 0;
}

const REPO = 'https://github.com/Nekomo-App/nekomo-web';

/** Prefilled GitHub issue link for sharing an error report. */
export function githubIssueUrl(e: ErrorEntry): string {
  const title = `[${e.source}] ${e.context ? `${e.context}: ` : ''}${e.message.slice(0, 80)}`;
  const body = [
    '**Error report from Nekomo**',
    '',
    `- **Time:** ${e.at}`,
    `- **Source:** ${e.source}`,
    `- **Context:** ${e.context ?? '—'}`,
    e.status !== undefined ? `- **Status:** ${e.status}` : null,
    e.url ? `- **Page:** ${e.url}` : null,
    '',
    '```',
    e.message,
    '```',
    '',
    '_Reported via the Nekomo error dashboard._',
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
  const p = new URLSearchParams({ title, body, labels: 'bug' });
  return `${REPO}/issues/new?${p}`;
}
