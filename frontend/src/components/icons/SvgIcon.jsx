/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 *
 * Unified SVG icon collection — calm luxury, clean stroke aesthetic.
 * All icons: 24x24 viewBox, stroke-based, consistent weight.
 */

const ICONS = {
  /* ─── Navigation / UI ─── */
  check: 'M20 6L9 17l-5-5',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  chevronLeft: 'M15 18l-6-6 6-6',
  x: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  menu: 'M4 12h16M4 6h16M4 18h16',
  search: 'M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35',
  edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  refresh: 'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',

  home: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', 'M9 22V12h6v10'],
  pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
  sparkle: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z',

  /* ─── Status / Info ─── */
  info: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01',
  alert: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',

  /* ─── Goal / Achievement ─── */
  target: ['M12 2a10 10 0 100 20 10 10 0 000-20z', 'M12 6a6 6 0 100 12 6 6 0 000-12z', 'M12 10a2 2 0 100 4 2 2 0 000-4z'],
  trophy: ['M6 9H4.5a2.5 2.5 0 010-5H6', 'M18 9h1.5a2.5 2.5 0 000-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22', 'M18 2H6v7a6 6 0 0012 0V2z'],
  crown: 'M2 20h20L19 10l-4 4-3-6-3 6-4-4-3 10z',
  medal: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  rocket: ['M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z', 'M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z', 'M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0', 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3'],

  /* ─── Time / Calendar ─── */
  clock: ['M12 2a10 10 0 100 20 10 10 0 000-20z', 'M12 6v6l4 2'],
  calendar: ['M3 4a2 2 0 012-2h14a2 2 0 012 2v18H3V4z', 'M16 2v4M8 2v4M3 10h18'],
  sunrise: ['M12 2v8', 'M4.93 10.93l1.41 1.41', 'M2 18h2', 'M20 18h2', 'M19.07 10.93l-1.41 1.41', 'M22 22H2', 'M8 6l4-4 4 4', 'M16 18a4 4 0 10-8 0'],
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  sun: ['M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42', 'M12 6a6 6 0 100 12 6 6 0 000-12z'],

  /* ─── Body / Wellness ─── */
  dumbbell: ['M6.5 6.5H4a1.5 1.5 0 00-1.5 1.5v8A1.5 1.5 0 004 17.5h2.5', 'M17.5 6.5H20a1.5 1.5 0 011.5 1.5v8a1.5 1.5 0 01-1.5 1.5h-2.5', 'M6.5 4v16', 'M17.5 4v16', 'M6.5 12h11'],
  heart: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  leaf: ['M11 20A7 7 0 019.8 6.9C15.5 5.5 20 4.5 20 4.5S19 9 17.1 14.7A7 7 0 0111 20z', 'M6.7 17.3l4.6-4.6'],
  sprout: ['M7 20h10', 'M10 20c5.5-2.5.8-6.4 3-10', 'M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-4-4.8 1.1-.2 6.5-1.1 6.5 1.4z', 'M14.1 14c.8-3 .8-5.6-.3-7.5'],

  /* ─── Mind / Focus ─── */
  brain: ['M9.5 2a6.5 6.5 0 00-5.39 10.14C3.4 13.58 3 15.24 3 17a5 5 0 005 5h8a5 5 0 005-5c0-1.76-.4-3.42-1.11-4.86A6.5 6.5 0 0014.5 2', 'M12 2v20'],
  lightbulb: ['M9 21h6', 'M12 3a6 6 0 00-4 10.47V17h8v-3.53A6 6 0 0012 3z'],
  eye: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'],
  compass: ['M12 2a10 10 0 100 20 10 10 0 000-20z', 'M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z'],
  book: ['M4 19.5A2.5 2.5 0 016.5 17H20', 'M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z'],

  /* ─── Energy / Power ─── */
  lightning: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  flame: ['M8.5 14.5A2.5 2.5 0 0011 12c0-1.38.5-2 1-3 1.5 2 2 3.5 2 5a3 3 0 01-6 0z', 'M12 2c.5 2 2 4 2 8a6 6 0 01-12 0c0-4 1.5-6 2-8'],
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  bolt: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',

  /* ─── Nature / Calm ─── */
  mountain: 'M8 3l4 8 5-5 5 10H2L8 3z',
  wave: 'M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0',
  gem: ['M6 3h12l4 6-10 13L2 9l4-6z', 'M12 22L2 9h20L12 22z', 'M6 3l6 6 6-6'],

  /* ─── Social / Connection ─── */
  users: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 7a4 4 0 100 8 4 4 0 000-8z', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'],
  chat: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  microphone: ['M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z', 'M19 10v2a7 7 0 01-14 0v-2', 'M12 19v4M8 23h8'],

  /* ─── Progress / Stats ─── */
  chart: 'M22 12h-4l-3 9L9 3l-3 9H2',
  barChart: ['M12 20V10', 'M18 20V4', 'M6 20v-4'],
  trendUp: 'M23 6l-9.5 9.5-5-5L1 18',

  /* ─── Lock / Security ─── */
  lock: ['M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z', 'M7 11V7a5 5 0 0110 0v4'],
  unlock: ['M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z', 'M7 11V7a5 5 0 019.9-1'],

  /* ─── Special / Themed ─── */
  freeze: ['M12 2v20', 'M17 5l-10 14', 'M7 5l10 14', 'M2 12h20'],
  snowflake: ['M12 2v20', 'M20 12H4', 'M18.36 5.64L5.64 18.36', 'M18.36 18.36L5.64 5.64'],
  sparkles: ['M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z', 'M5 16l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z', 'M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z'],
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  balance: ['M12 3v18', 'M3 7l9-4 9 4', 'M3 7v4a9 9 0 009 9', 'M21 7v4a9 9 0 01-9 9'],
  clipboard: ['M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2', 'M8 2h8a1 1 0 011 1v1a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1z'],
  layers: ['M12 2L2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
};

/* ─── Domain icon hint mapping (from LLM) ─── */
export const domainIconMap = {
  physical: 'dumbbell', strength: 'dumbbell', fitness: 'dumbbell', exercise: 'dumbbell',
  mental: 'brain', focus: 'brain', cognitive: 'brain', mindset: 'brain',
  emotional: 'heart', relationships: 'heart', love: 'heart', connection: 'heart',
  social: 'users', community: 'users', network: 'users',
  spiritual: 'sparkles', mindfulness: 'sparkles', meditation: 'sparkles',
  professional: 'rocket', career: 'rocket', business: 'rocket', work: 'rocket',
  creative: 'gem', art: 'gem', expression: 'gem',
  financial: 'barChart', money: 'barChart', wealth: 'barChart',
  nutrition: 'leaf', diet: 'leaf', food: 'leaf', health: 'leaf',
  sleep: 'moon', rest: 'moon', recovery: 'moon',
  learning: 'book', education: 'book', study: 'book', reading: 'book',
  habits: 'sprout', routine: 'sprout', discipline: 'sprout', foundation: 'sprout',
  energy: 'lightning', motivation: 'lightning', drive: 'lightning',
  wellness: 'shield', protection: 'shield', safety: 'shield',
  growth: 'trendUp', progress: 'trendUp', mastery: 'crown',
  strategic: 'compass', tactical: 'target', planning: 'compass',
  leadership: 'crown', impact: 'star', legacy: 'medal',
  innovation: 'lightbulb', skills: 'layers', advanced: 'zap',
  nature: 'mountain', outdoor: 'mountain', adventure: 'mountain',
  communication: 'chat', service: 'heart', time: 'clock',
};

/**
 * Map a domain name to an icon name using fuzzy matching.
 */
export function getDomainIcon(domainName) {
  if (!domainName) return 'target';
  const lower = domainName.toLowerCase();

  // Direct match on icon hint
  if (ICONS[lower]) return lower;

  // Check domain map
  for (const [keyword, icon] of Object.entries(domainIconMap)) {
    if (lower.includes(keyword)) return icon;
  }

  return 'target';
}

/**
 * SvgIcon — unified icon component.
 *
 * @param {string} name - Icon name from ICONS map
 * @param {number} size - Width/height in px (default 20)
 * @param {string} color - Stroke color (default 'currentColor')
 * @param {number} strokeWidth - Stroke width (default 1.75)
 * @param {string} className - Optional CSS class
 * @param {object} style - Optional inline styles
 */
export function SvgIcon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.75,
  className,
  style,
  ...rest
}) {
  const paths = ICONS[name];
  if (!paths) return null;

  const pathArray = Array.isArray(paths) ? paths : [paths];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'flex', flexShrink: 0, ...style }}
      {...rest}
    >
      {pathArray.map((d, i) => {
        // Handle rect elements for lock/clipboard
        if (d.startsWith('M') || d.startsWith('m') || d.startsWith('L') || d.startsWith('C')) {
          return <path key={i} d={d} />;
        }
        return <path key={i} d={d} />;
      })}
    </svg>
  );
}

export default SvgIcon;
