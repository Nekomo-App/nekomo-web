import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#100A12', alt: '#1B101B' },
        card: '#261323',
        rose: {
          dark: '#7A174F',
          DEFAULT: '#D92B83',
          mid: '#8E2A68',
          light: '#F4A7CD',
        },
        ink: { DEFAULT: '#F7EFF5', muted: '#BDA9B8' },
        line: '#42243A',
        success: '#58D68D',
        warn: '#F5B942',
        danger: '#FF6577',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 28px rgba(217, 43, 131, 0.35)',
        'glow-sm': '0 0 14px rgba(217, 43, 131, 0.28)',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
