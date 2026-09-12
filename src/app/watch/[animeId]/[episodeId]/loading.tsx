export default function Loading() {
  return (
    <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6" aria-busy="true">
      <div className="skeleton mb-4 h-4 w-64 rounded" aria-hidden="true" />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0" aria-hidden="true">
          <div className="skeleton aspect-video w-full rounded-2xl" />
          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-7 w-2/3 rounded" />
              <div className="skeleton h-4 w-1/3 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="skeleton h-9 w-20 rounded-lg" />
              <div className="skeleton h-9 w-20 rounded-lg" />
            </div>
          </div>
        </div>
        <div aria-hidden="true">
          <div className="skeleton mb-3 h-4 w-24 rounded" />
          <div className="skeleton h-[560px] w-full rounded-xl" />
          <div className="skeleton mt-4 h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
