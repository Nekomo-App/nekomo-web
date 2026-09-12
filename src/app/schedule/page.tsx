import type { Metadata } from 'next';
import { getWeeklySchedule } from '@/lib/providers';
import { WeeklySchedule } from '@/components/WeeklySchedule';

export const metadata: Metadata = { title: 'Schedule' };
export const dynamic = 'force-dynamic';

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const week = await getWeeklySchedule();
  const day = typeof searchParams.day === 'string' ? searchParams.day : undefined;

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6">
      <h1 className="mb-2 font-display text-3xl font-bold">Weekly Schedule</h1>
      <p className="mb-8 text-sm text-ink-muted">Simulcast calendar — pick a day or view the whole week.</p>
      <WeeklySchedule week={week} initialDay={day} />
    </div>
  );
}
