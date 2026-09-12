// Original Nekomō logo — a simple cat-inspired mark, drawn for this project.

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="nekomo-g" x1="8" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F4A7CD" />
            <stop offset="0.55" stopColor="#D92B83" />
            <stop offset="1" stopColor="#7A174F" />
          </linearGradient>
        </defs>
        {/* ears */}
        <path d="M10 20 L13 5 L24 13 Z" fill="url(#nekomo-g)" />
        <path d="M38 20 L35 5 L24 13 Z" fill="url(#nekomo-g)" />
        {/* face */}
        <path
          d="M24 11 C35 11 42 18 42 28 C42 38 34 44 24 44 C14 44 6 38 6 28 C6 18 13 11 24 11 Z"
          fill="url(#nekomo-g)"
        />
        {/* inner ears */}
        <path d="M13.5 17.5 L15 10 L21 14.5 Z" fill="#100A12" opacity="0.55" />
        <path d="M34.5 17.5 L33 10 L27 14.5 Z" fill="#100A12" opacity="0.55" />
        {/* eyes */}
        <ellipse cx="17.5" cy="27" rx="2.6" ry="3.4" fill="#100A12" />
        <ellipse cx="30.5" cy="27" rx="2.6" ry="3.4" fill="#100A12" />
        <circle cx="18.4" cy="25.8" r="0.9" fill="#F4A7CD" />
        <circle cx="31.4" cy="25.8" r="0.9" fill="#F4A7CD" />
        {/* nose + mouth */}
        <path d="M24 31.5 L22.4 33.4 Q24 35 25.6 33.4 Z" fill="#100A12" />
        {/* whiskers */}
        <path d="M8 30 Q12 31 15 30.6" stroke="#100A12" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <path d="M8 34 Q12 34.4 15 33.6" stroke="#100A12" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <path d="M40 30 Q36 31 33 30.6" stroke="#100A12" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <path d="M40 34 Q36 34.4 33 33.6" stroke="#100A12" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      </svg>
      <span className="font-display text-2xl font-bold tracking-tight text-white">
        Nekom<span className="text-rose">ō</span>
      </span>
    </span>
  );
}
