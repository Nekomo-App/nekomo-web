// In-memory report store for the demo admin dashboard.
// Production: persist to DATABASE_URL and notify DMCA_CONTACT_EMAIL.

import type { BrokenSourceReport } from '@/lib/types';

export interface StoredReport extends BrokenSourceReport {
  id: string;
  at: string;
  resolved: boolean;
}

const reports: StoredReport[] = [];
const MAX = 200;

export function addReport(r: BrokenSourceReport): StoredReport {
  const stored: StoredReport = {
    ...r,
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    resolved: false,
  };
  reports.unshift(stored);
  if (reports.length > MAX) reports.pop();
  return stored;
}

export function getReports(): StoredReport[] {
  return reports;
}

export function resolveReport(id: string): boolean {
  const r = reports.find((x) => x.id === id);
  if (!r) return false;
  r.resolved = true;
  return true;
}
