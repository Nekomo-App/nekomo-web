import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { cacheStats } from '@/lib/cache';
import { getFlags, listIntegrations } from '@/lib/admin/store';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const startedAt = Date.now();
let version = '0.0.0';
try {
  version = JSON.parse(
    readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  ).version;
} catch {
  // package.json unavailable in some serverless bundles — non-fatal
}

/** System health for the admin dashboard. Admin-only. */
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const mem = process.memoryUsage();
  const integrations = listIntegrations();
  const counts = { healthy: 0, degraded: 0, down: 0, unknown: 0 };
  for (const i of integrations) counts[i.health.status]++;

  return NextResponse.json({
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    node: process.version,
    env: process.env.NODE_ENV,
    version,
    memoryMb: Math.round(mem.rss / 1024 / 1024),
    cache: cacheStats(),
    flags: getFlags(),
    integrations: { total: integrations.length, ...counts },
    // presence of env config, never values
    config: {
      adminKeyConfigured: Boolean(process.env.ADMIN_KEY) || process.env.NODE_ENV !== 'production',
      authSecretConfigured: Boolean(process.env.AUTH_SECRET),
      metadataApiConfigured: Boolean(process.env.ANIME_METADATA_API_URL),
      streamingApiConfigured: Boolean(process.env.OFFICIAL_STREAMING_API_URL),
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      storageConfigured: Boolean(process.env.STORAGE_BUCKET),
    },
    // no database/worker infra exists yet — reported honestly
    database: process.env.DATABASE_URL ? 'configured (not connected)' : 'not configured',
    workers: 'not configured',
    storage: process.env.STORAGE_BUCKET ? 'configured (not connected)' : 'not configured',
  });
}
