export function CardSkeleton() {
  return (
    <div className="space-y-2">
      <div className="skeleton aspect-[2/3] w-full rounded-xl" />
      <div className="skeleton h-3.5 w-3/4 rounded" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 min-[481px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="w-40 shrink-0 sm:w-44">
          <CardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return <div className="skeleton h-[420px] w-full rounded-2xl md:h-[520px]" aria-hidden="true" />;
}
