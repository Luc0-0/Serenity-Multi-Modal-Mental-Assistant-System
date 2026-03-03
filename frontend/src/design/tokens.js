/**
 * Design System Tokens
 * Serenity - Mental Health Companion
 * Based on "Obsidian Luxe" premium dark theme
 */

export const colors = {
  // Dark Mode (Primary) - Ultra-premium obsidian
  background: {
    primary: '#0a0a0b',     // Ultra-deep obsidian black
    secondary: '#121214',   // Slightly lighter dark
    tertiary: '#1a1a1d',    // Warmer dark surface
    elevated: '#2d2d32',    // Card/elevated surfaces
  },

  // Text colors
  text: {
    primary: '#fafafa',     // Off-white
    secondary: '#a3a3a3',   // Mid-gray
    muted: '#737373',       // Darker gray
  },

  // Accent - Warm matte gold
  accent: {
    primary: '#d4a853',     // Warm matte gold (hero accent)
    hover: '#c4993d',       // Darker gold on interaction
    light: '#e8c975',       // Lighter gold
  },

  // Semantic
  success: '#A8D5BA',       // Soft sage/teal
  calm: '#8BBFB3',          // Calm teal
  warning: '#D4A574',       // Warm brown
  
  // Borders & dividers
  border: '#2d2d32',
  divider: '#1a1a1d',
  
  // Light Mode (Alternative)
  light: {
    background: {
      primary: '#faf9f6',   // Warm ivory/cream
      secondary: '#f3f1ed', // Pale beige
      tertiary: '#e8e5de',  // Warmer neutral
      elevated: '#ffffff',  // White for cards
    },
    text: {
      primary: '#2b2620',   // Deep warm charcoal
      secondary: '#6b6259', // Mid-brown
      muted: '#9a9185',     // Lighter brown
    },
    accent: {
      primary: '#c4a872',   // Rich muted gold
      hover: '#b39759',     // Darker gold
    },
  },
};

export const typography = {
  // Font families - Premium stack
  fontFamily: {
    display: "'Playfair Display', 'Georgia', serif", // Elegant display headings
    sans: "'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', sans-serif", // Clean body
    mono: "'JetBrains Mono', 'Courier New', monospace", // Code/technical
  },

  // Font sizes - Responsive clamp() scales
  fontSize: {
    xs: 'clamp(0.75rem, 2vw, 0.875rem)',
    sm: 'clamp(0.875rem, 2.5vw, 1rem)',
    base: 'clamp(1rem, 2.5vw, 1.125rem)',
    lg: 'clamp(1.125rem, 3vw, 1.25rem)',
    xl: 'clamp(1.25rem, 3vw, 1.5rem)',
    '2xl': 'clamp(1.5rem, 3.5vw, 1.875rem)',
    '3xl': 'clamp(1.875rem, 4vw, 2.25rem)',
    '4xl': 'clamp(2.25rem, 5vw, 3rem)',
    displayXl: 'clamp(3rem, 8vw, 6rem)', // Hero headings
  },

  // Line heights
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },

  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
  },

  // Letter spacing
  letterSpacing: {
    tight: '-0.01em',
    normal: '0',
    relaxed: '0.01em',
    wide: '0.05em',
  },
};

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
};

export const borderRadius = {
  none: '0',
  sm: '4px',
  base: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  base: '0 4px 12px rgba(0, 0, 0, 0.15)',
  lg: '0 12px 24px rgba(0, 0, 0, 0.2)',
  xl: '0 20px 40px rgba(0, 0, 0, 0.25)',
  // Inset shadow for depth
  inset: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
};

export const transitions = {
  // Standard easing
  fast: '150ms ease-in-out',
  base: '250ms ease-in-out',
  slow: '350ms ease-in-out',
  
  // Premium custom easing (cubic-bezier(0.22, 1, 0.36, 1))
  premium: '400ms cubic-bezier(0.22, 1, 0.36, 1)',
  
  // Animation timings
  fadeIn: '0.8s ease-out',
  slideUp: '0.6s cubic-bezier(0.22, 1, 0.36, 1)',
  scaleIn: '0.6s cubic-bezier(0.22, 1, 0.36, 1)',
  glowPulse: '3s infinite',
  float: '6s infinite ease-in-out',
  neuralPulse: '2s infinite',
};

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 10,
  modal: 20,
  popover: 30,
  tooltip: 40,
};
