import type { Metadata } from 'next';
import { isAdmin } from '@/lib/auth';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { DeveloperPanel } from '@/components/admin/DeveloperPanel';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Developer · Nekomo',
  robots: { index: false, follow: false },
};

export default function DeveloperPage() {
  if (!isAdmin()) return <AdminLogin />;
  return <DeveloperPanel />;
}
