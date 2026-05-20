import type { Config } from 'tailwindcss';

// ─── Design tokens — synced with Babkoschet/app-v3.jsx ──────────────────────
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        // Brand (indigo) — primary actions / accents
        brand: {
          50:  '#EEF0FF',
          100: '#E0E3FE',
          200: '#C9CEFD',
          300: '#A5ADFC',
          400: '#818CF8',
          500: '#7679F3',
          600: '#6366F1',
          700: '#4F46E5',
          800: '#4338CA',
          900: '#1E1F4B',
          950: '#1B1A33',
        },
        // Surfaces
        cream:       '#F4F2EC',  // light page background
        sidebar:     '#1E2235',  // dark sidebar (in BOTH themes)
        sidebarSoft: '#262A40',
        sidebarMute: '#9CA3AF',
        // Semantic money colors
        income:  '#22C55E',
        expense: '#EF4444',
      },
      boxShadow: {
        // Soft card lift — used everywhere instead of generic shadow-sm
        soft: '0 1px 0 rgba(15,17,23,0.04), 0 8px 24px -16px rgba(15,17,23,0.08)',
      },
      letterSpacing: {
        tightish: '-0.01em',
      },
    },
  },
  plugins: [],
};

export default config;
