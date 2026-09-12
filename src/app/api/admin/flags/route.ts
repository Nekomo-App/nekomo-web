import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getFlags, setFlags } from '@/lib/admin/store';

const EDITABLE = new Set(['maintenance', 'debugLogging', 'apiLogging', 'localFallback']);

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ flags: getFlags() });
}

export async function PATCH(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const patch: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(body)) {
    if (EDITABLE.has(k)) patch[k] = Boolean(v);
  }
  return NextResponse.json({ flags: setFlags(patch) });
}
