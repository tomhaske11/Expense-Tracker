/**
 * Recharts colors for the dark theme. Recharts takes raw color values (SVG attributes and
 * inline styles), so these mirror the tokens in globals.css.
 */
export const CHART = {
  /** Card background; used as the 2px gap between slices and bars. */
  surface: '#141414',
  grid: '#2a2a2a',
  axis: '#8a8a8a',
  text: '#d4d4d4',
  /** Text drawn on top of a colored slice. */
  onSlice: '#0a0a0a',
  accent: '#2dd4bf',
  /** Price lines: up uses the accent; down is a soft red (always paired with a sign, never color alone). */
  up: '#2dd4bf',
  down: '#f87171',
  tooltip: {
    contentStyle: { background: '#1f1f1f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#f5f5f5' },
    itemStyle: { color: '#d4d4d4' },
    labelStyle: { color: '#f5f5f5' },
    cursor: { fill: 'rgba(255,255,255,0.04)' },
  },
} as const;
