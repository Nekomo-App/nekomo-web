import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { clearErrors, getErrors } from '@/lib/errors';
import { audit } from '@/lib/admin/store';

/** GET /api/admin/errors — recent application errors (admin only). */
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ errors: getErrors() });
}

/** DELETE /api/admin/errors — clear the log (admin only). */
export async function DELETE() {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  clearErrors();
  audit('errors.clear');
  return NextResponse.json({ ok: true });
}
