import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { cacheClear, cacheStats } from '@/lib/cache';
import { audit } from '@/lib/admin/store';

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(cacheStats());
}

export async function DELETE() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const before = cacheStats().size;
  cacheClear();
  audit('cache.clear', undefined, `${before} entries`);
  return NextResponse.json({ cleared: before });
}
