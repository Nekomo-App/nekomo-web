import { NextResponse } from 'next/server';
import { getIntegration, toPublicSource } from '@/lib/admin/store';

/** GET — public detail for one approved, enabled source. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = getIntegration(params.id);
  if (!item || item.deletedAt || !item.enabled || item.reviewState !== 'approved') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ source: toPublicSource(item) });
}
