import { GridSkeleton, HeroSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1560px] space-y-8 px-4 py-6 sm:px-6" aria-busy="true">
      <HeroSkeleton />
      <GridSkeleton count={12} />
    </div>
  );
}
