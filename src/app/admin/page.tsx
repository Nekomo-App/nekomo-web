import type { Metadata } from 'next';
import { isAdmin } from '@/lib/auth';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin · Nekomo',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  // Server-side authorization: the dashboard is never rendered for
  // unauthenticated visitors — not merely hidden client-side.
  if (!isAdmin()) return <AdminLogin />;
  return <AdminDashboard />;
}
