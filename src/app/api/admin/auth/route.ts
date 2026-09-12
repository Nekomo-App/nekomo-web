import { NextResponse } from 'next/server';
import { checkAdminKey, clearAdminCookie, isAdmin, setAdminCookie } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { audit } from '@/lib/admin/store';

export async function GET() {
  return NextResponse.json({ admin: isAdmin() });
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  const rl = rateLimit(`admin-auth:${ip}`, 8, 60_000); // strict: brute-force protection
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many attempts — try again in ${rl.retryAfterSec}s` },
      { status: 429 },
    );
  }

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!checkAdminKey(body.key ?? '')) {
    audit('auth.failed', undefined, ip);
    return NextResponse.json({ error: 'Invalid key' }, { status: 401 });
  }

  setAdminCookie();
  audit('auth.login', undefined, ip);
  return NextResponse.json({ admin: true });
}

export async function DELETE() {
  clearAdminCookie();
  audit('auth.logout');
  return NextResponse.json({ admin: false });
}
