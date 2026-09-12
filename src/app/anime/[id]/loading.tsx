export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="skeleton h-72 w-full rounded-none sm:h-96" aria-hidden="true" />
      <div className="relative mx-auto -mt-36 max-w-[1560px] px-4 pb-16 sm:-mt-44 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="skeleton aspect-[2/3] w-32 shrink-0 rounded-xl sm:w-44 md:w-56" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-4 md:pt-16" aria-hidden="true">
            <div className="flex gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="skeleton h-6 w-16 rounded-full" />
              ))}
            </div>
            <div className="skeleton h-10 w-2/3 max-w-md rounded-lg" />
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="skeleton h-6 w-20 rounded-full" />
              ))}
            </div>
            <div className="skeleton h-28 w-full max-w-3xl rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
