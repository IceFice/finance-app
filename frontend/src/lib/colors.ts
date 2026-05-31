// Shared design-system colors + helpers.
// Previously hexA() was copy-pasted into 8 files and shade() into 2; the
// semantic hex constants were re-declared per page. Single source of truth.

// Semantic palette — mirrors tailwind.config.ts tokens for use in inline
// styles / SVG where Tailwind classes don't reach (chart strokes, gradients).
export const ACCENT = '#6366F1';
export const INCOME = '#22C55E';
export const EXPENSE = '#EF4444';
export const WARN = '#F59E0B';
export const PINK = '#EC4899';
export const SKY = '#0EA5E9';
export const VIOLET = '#A855F7';

/** hex (#RRGGBB) → rgba string with the given alpha. */
export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Lighten (positive percent) or darken (negative) a hex color. */
export function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0xff) + amt;
  const B = (num & 0xff) + amt;
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  return '#' + (0x1000000 + clamp(R) * 0x10000 + clamp(G) * 0x100 + clamp(B)).toString(16).slice(1);
}
