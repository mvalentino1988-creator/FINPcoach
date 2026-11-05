/**
 * FINPcoach Unified Design System
 * =================================
 * Single source of truth for all design tokens.
 * Used across all screens for consistent UI.
 */

// ============================================================================
// COLOR TOKENS (Premium Modern Palette, Light Theme)
// ============================================================================
export const COLORS = {
  // Primary (Royal Blue)
  primary: '#1e40af',
  primaryContainer: '#2563eb',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#ffffff',
  primaryFixed: '#60a5fa',
  primaryFixedDim: '#3b82f6',
  onPrimaryFixed: '#ffffff',

  // Secondary (Teal)
  secondary: '#0d9488',
  secondaryContainer: '#ccfbf1',
  onSecondary: '#0f766e',
  onSecondaryContainer: '#115e59',
  secondaryFixed: '#5eead4',
  onSecondaryFixed: '#134e4a',

  // Tertiary (Coral accent)
  tertiary: '#f97316',
  tertiaryContainer: '#fdba74',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#ffffff',
  tertiaryFixed: '#ffedd5',
  tertiaryFixedDim: '#fdba74',
  onTertiaryFixed: '#431407',

  // Surfaces (5-level architecture)
  surface: '#f8fafc',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f1f5f9',
  surfaceContainer: '#e2e8f0',
  surfaceContainerHigh: '#cbd5e1',
  surfaceContainerHighest: '#94a3b8',
  surfaceVariant: '#e2e8f0',

  // On-surface colors
  onSurface: '#0f172a',
  onSurfaceVariant: '#475569',
  onBackground: '#0f172a',

  // Error
  error: '#dc2626',
  onError: '#ffffff',
  errorContainer: '#fee2e2',
  onErrorContainer: '#991b1b',

  // Outline
  outline: '#94a3b8',
  outlineVariant: '#e2e8f0',

  // Inverse
  inverseSurface: '#1e293b',
  inverseOnSurface: '#f1f5f9',
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================
export const TYPOGRAPHY = {
  // Display (hero numbers, large metrics)
  display: {
    fontSize: 'clamp(32px, 1.2vw + 24px, 40px)',
    lineHeight: '1.1',
    fontWeight: '700',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '-0.02em',
  },

  // Headlines (titles, section headers)
  headlineLarge: {
    fontSize: 'clamp(24px, 0.7vw + 20px, 28px)',
    lineHeight: '1.15',
    fontWeight: '700',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '-0.01em',
  },
  headlineMedium: {
    fontSize: 'clamp(18px, 0.4vw + 16px, 22px)',
    lineHeight: '1.25',
    fontWeight: '600',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '-0.005em',
  },
  headlineSmall: {
    fontSize: 'clamp(16px, 0.25vw + 15px, 18px)',
    lineHeight: '1.3',
    fontWeight: '600',
    fontFamily: "'Space Grotesk', sans-serif",
  },

  // Body (content text)
  bodyLarge: {
    fontSize: '16px',
    lineHeight: '1.6',
    fontWeight: '400',
    fontFamily: "'Public Sans', sans-serif",
  },
  bodyMedium: {
    fontSize: '14px',
    lineHeight: '1.5',
    fontWeight: '400',
    fontFamily: "'Public Sans', sans-serif",
  },
  bodySmall: {
    fontSize: '13px',
    lineHeight: '1.45',
    fontWeight: '400',
    fontFamily: "'Public Sans', sans-serif",
  },

  // Labels (metadata, chip text)
  labelLarge: {
    fontSize: 'clamp(13px, 0.1vw + 12.7px, 14px)',
    lineHeight: '1.3',
    fontWeight: '600',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '0.02em',
  },
  labelMedium: {
    fontSize: 'clamp(11px, 0.12vw + 10.6px, 12px)',
    lineHeight: '1.25',
    fontWeight: '700',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '0.04em',
  },
  labelSmall: {
    fontSize: 'clamp(10px, 0.12vw + 9.6px, 11px)',
    lineHeight: '1.25',
    fontWeight: '700',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '0.06em',
  },
} as const;

// ============================================================================
// SPACING TOKENS (4/8/12/16/24/32/48 rhythm)
// ============================================================================
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',
} as const;

// ============================================================================
// RADIUS TOKENS
// ============================================================================
export const RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '9999px',
} as const;

// ============================================================================
// SHADOW TOKENS
// ============================================================================
export const SHADOWS = {
  card: '0 1px 2px rgba(15, 23, 42, 0.05)',
  pop: '0 4px 12px rgba(15, 23, 42, 0.08)',
  float: '0 8px 24px rgba(15, 23, 42, 0.12)',
  primarySm: '0 2px 8px rgba(0, 104, 116, 0.20)',
  primaryMd: '0 4px 14px rgba(0, 104, 116, 0.25)',
  nav: '0 -1px 12px rgba(0, 0, 0, 0.06)',
} as const;

// ============================================================================
// LAYOUT TOKENS
// ============================================================================
export const LAYOUT = {
  headerHeight: '60px',
  dockHeight: '56px',
  gutterMobile: '12px',
  gutterDesktop: '20px',
  touchTarget: '48px',
} as const;

// ============================================================================
// UTILITIES
// ============================================================================
export const timeFormatter = (centiseconds: number): string => {
  const totalSeconds = Math.floor(centiseconds / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = centiseconds % 100;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }
  return `${seconds}.${String(centis).padStart(2, '0')}`;
};

export const deltaFormatter = (deltaMs: number): string => {
  const deltaSec = deltaMs / 100;
  const sign = deltaSec >= 0 ? '+' : '−';
  return `${sign}${Math.abs(deltaSec).toFixed(1)} s`;
};
