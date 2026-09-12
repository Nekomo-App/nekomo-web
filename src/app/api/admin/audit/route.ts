import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getAuditLog } from '@/lib/admin/store';

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ entries: getAuditLog() });
}
