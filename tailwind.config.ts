import type { Config } from 'tailwindcss';

// All palette colors resolve to CSS custom properties so user themes can
// recolor the whole app at runtime. Values are space-separated RGB triplets
// (see globals.css for definitions and theme variants).

const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: withAlpha('--bg'), alt: withAlpha('--bg-alt') },
        card: withAlpha('--card'),
        rose: {
          dark: withAlpha('--accent-dark'),
          DEFAULT: withAlpha('--accent'),
          mid: withAlpha('--accent-mid'),
          light: withAlpha('--accent-light'),
        },
        ink: { DEFAULT: withAlpha('--ink'), muted: withAlpha('--ink-muted') },
        line: withAlpha('--line'),
        success: withAlpha('--success'),
        warn: withAlpha('--warn'),
        danger: withAlpha('--danger'),
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'calc(var(--radius) * 0.67)',
        xl: 'var(--radius)',
        '2xl': 'calc(var(--radius) * 1.33)',
      },
      boxShadow: {
        glow: '0 0 28px rgb(var(--accent) / 0.35)',
        'glow-sm': '0 0 14px rgb(var(--accent) / 0.28)',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
