/**
 * Design Token: Colors
 * Extracted from mumnhun-design mockup repository
 * 
 * Color Palette: Premium Warm Motherly Theme
 * Inspired by nature: Forest Teal, Terracotta accents, Warm Beige backgrounds
 */

export const colors = {
  // ═══════════════════════════════════════════════════════
  // PRIMARY COLORS
  // ═══════════════════════════════════════════════════════
  primary: {
    DEFAULT: '#466A68', // Deep Forest Teal - Main brand color
    dark: '#2F4A48',    // Darker teal for hover states
    light: '#5A8280',   // Lighter teal for subtle accents
  },

  // ═══════════════════════════════════════════════════════
  // SECONDARY / TEXT COLORS
  // ═══════════════════════════════════════════════════════
  secondary: {
    DEFAULT: '#382821', // Dark Coffee - Main text color
    light: '#4A3B32',   // Lighter brown for secondary text
    muted: '#6B5B52',   // Muted brown for descriptions
  },

  // ═══════════════════════════════════════════════════════
  // ACCENT COLORS
  // ═══════════════════════════════════════════════════════
  accent: {
    DEFAULT: '#C48B77', // Terracotta - Accent highlights, underlines
    light: '#D9A899',   // Light terracotta
    dark: '#A67766',    // Dark terracotta
  },

  // ═══════════════════════════════════════════════════════
  // BACKGROUND COLORS
  // ═══════════════════════════════════════════════════════
  background: {
    // Page-level backgrounds
    body: '#F0E5D8',           // Soft cream body background
    
    // Hero section gradient (Left to Right)
    heroStart: '#FFFBF7',      // Light cream (left)
    heroMid: '#F3E7DB',        // Warm beige (center)
    heroEnd: '#E2CDBA',        // Sand beige (right)
    
    // Section backgrounds
    sectionLight: 'rgba(255, 255, 255, 0.4)',   // White 40% opacity
    sectionAlt: 'rgba(255, 255, 255, 0.6)',     // White 60% opacity
    
    // Footer gradient
    footerStart: '#D4BCAA',    // Warm sand
    footerEnd: '#F4EEE7',      // Light cream
    
    // Card backgrounds
    card: 'rgba(255, 255, 255, 0.4)',           // Glassmorphism cards
    cardHover: 'rgba(255, 255, 255, 0.8)',      // Card hover state
    cardPopular: 'rgba(255, 255, 255, 0.9)',    // Featured/popular cards
  },

  // ═══════════════════════════════════════════════════════
  // SURFACE COLORS (Cards, Buttons, Elements)
  // ═══════════════════════════════════════════════════════
  surface: {
    white: '#FFFFFF',
    light: 'rgba(255, 255, 255, 0.5)',
    glass: 'rgba(255, 255, 255, 0.6)',
    overlay: 'rgba(255, 255, 255, 0.8)',
  },

  // ═══════════════════════════════════════════════════════
  // BORDER COLORS
  // ═══════════════════════════════════════════════════════
  border: {
    light: 'rgba(255, 255, 255, 0.6)',
    dark: 'rgba(56, 40, 33, 0.1)',    // secondary with 10% opacity
    primary: 'rgba(70, 106, 104, 0.3)', // primary with 30% opacity
    accent: 'rgba(196, 139, 119, 0.5)', // accent with 50% opacity
  },

  // ═══════════════════════════════════════════════════════
  // TEXT COLORS
  // ═══════════════════════════════════════════════════════
  text: {
    primary: '#382821',           // Main headings
    secondary: 'rgba(56, 40, 33, 0.7)',  // Body text
    muted: 'rgba(56, 40, 33, 0.5)',      // Helper text
    light: 'rgba(56, 40, 33, 0.6)',      // Light descriptions
    inverse: '#FFFFFF',           // Text on dark backgrounds
    link: '#466A68',              // Link color (primary)
  },

  // ═══════════════════════════════════════════════════════
  // FUNCTIONAL COLORS
  // ═══════════════════════════════════════════════════════
  functional: {
    rating: '#FACC15',    // Yellow for star ratings (Tailwind yellow-400)
    success: '#466A68',   // Primary for success states
    info: '#466A68',      // Primary for info
    warning: '#C48B77',   // Accent for warnings
    error: '#EF4444',     // Red for errors
  },

  // ═══════════════════════════════════════════════════════
  // SHADOW COLORS
  // ═══════════════════════════════════════════════════════
  shadow: {
    glow: 'rgba(196, 139, 119, 0.3)',    // Accent glow
    soft: 'rgba(56, 40, 33, 0.08)',      // Soft shadows
    primary: 'rgba(70, 106, 104, 0.3)',  // Primary button shadows
    primaryIntense: 'rgba(70, 106, 104, 0.5)', // Primary hover shadows
    stone: 'rgba(56, 40, 33, 0.1)',      // Card shadows
  },
} as const;

// ═══════════════════════════════════════════════════════
// TAILWIND CONFIG EXTENSION
// ═══════════════════════════════════════════════════════
export const tailwindColors = {
  primary: colors.primary.DEFAULT,
  primaryDark: colors.primary.dark,
  secondary: colors.secondary.DEFAULT,
  accent: colors.accent.DEFAULT,
  beige: '#DBC4B0', // Sand color from mockup
  surface: colors.surface.white,
};

// CSS Custom properties format for globals.css
export const cssVariables = {
  '--color-primary': colors.primary.DEFAULT,
  '--color-primary-dark': colors.primary.dark,
  '--color-secondary': colors.secondary.DEFAULT,
  '--color-accent': colors.accent.DEFAULT,
  '--color-bg-body': colors.background.body,
  '--color-bg-hero-start': colors.background.heroStart,
  '--color-bg-hero-mid': colors.background.heroMid,
  '--color-bg-hero-end': colors.background.heroEnd,
} as const;

export type ColorToken = typeof colors;
export type TailwindColorExtension = typeof tailwindColors;
