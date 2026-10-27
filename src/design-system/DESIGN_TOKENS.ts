/**
 * FINPcoach Unified Design System
 * =================================
 * Single source of truth for all design tokens.
 * Used across all screens for consistent UI.
 */

// ============================================================================
// COLOR TOKENS (Teal Primary, Light Theme)
// ============================================================================
export const COLORS = {
  // Primary (Teal)
  primary: '#004e58',
  primaryContainer: '#006874',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#97e4f2',
  primaryFixed: '#a2effd',
  primaryFixedDim: '#85d2e0',
  onPrimaryFixed: '#001f24',

  // Secondary (Blue)
  secondary: '#006399',
  secondaryContainer: '#7ec2fd',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#004f7b',
  secondaryFixed: '#cde5ff',
  onSecondaryFixed: '#001d32',

  // Tertiary (Coral/Gold accent)
  tertiary: '#793000',
  tertiaryContainer: '#9e4202',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#ffceb7',
  tertiaryFixed: '#ffdbcb',
  onTertiaryFixed: '#341100',

  // Surfaces (5-level architecture)
  surface: '#faf8ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3ff',
  surfaceContainer: '#eaedff',
  surfaceContainerHigh: '#e2e7ff',
  surfaceContainerHighest: '#dae2fd',
  surfaceVariant: '#dae2fd',

  // On-surface colors
  onSurface: '#131b2e',
  onSurfaceVariant: '#3f484a',
  onBackground: '#131b2e',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Outline
  outline: '#6f797b',
  outlineVariant: '#bec8ca',

  // Inverse
  inverseSurface: '#283044',
  inverseOnSurface: '#eef0ff',
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================
export const TYPOGRAPHY = {
  // Display (hero numbers, large metrics)
  display: {
    fontSize: 'clamp(28px, 1.1vw + 22px, 34px)',
    lineHeight: '1.15',
    fontWeight: '700',
    fontFamily: "'Space Grotesk', sans-serif",
  },

  // Headlines (titles, section headers)
  headlineLarge: {
    fontSize: 'clamp(21px, 0.6vw + 18px, 26px)',
    lineHeight: '1.2',
    fontWeight: '700',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  headlineMedium: {
    fontSize: 'clamp(16px, 0.35vw + 15px, 19px)',
    lineHeight: '1.3',
    fontWeight: '600',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  headlineSmall: {
    fontSize: 'clamp(15px, 0.2vw + 14.4px, 17px)',
    lineHeight: '1.35',
    fontWeight: '600',
    fontFamily: "'Space Grotesk', sans-serif",
  },

  // Body (content text)
  bodyLarge: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: '400',
    fontFamily: "'Public Sans', sans-serif",
  },
  bodyMedium: {
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: '400',
    fontFamily: "'Public Sans', sans-serif",
  },
  bodySmall: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: '400',
    fontFamily: "'Public Sans', sans-serif",
  },

  // Labels (metadata, chip text)
  labelLarge: {
    fontSize: 'clamp(13px, 0.1vw + 12.7px, 14px)',
    lineHeight: '16px',
    fontWeight: '600',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  labelMedium: {
    fontSize: 'clamp(11px, 0.12vw + 10.6px, 12px)',
    lineHeight: '14px',
    fontWeight: '700',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  labelSmall: {
    fontSize: 'clamp(10px, 0.12vw + 9.6px, 11px)',
    lineHeight: '14px',
    fontWeight: '700',
    fontFamily: "'Space Grotesk', sans-serif",
  },
} as const;

// ============================================================================
// SPACING TOKENS (4/8/12/16/24 rhythm)
// ============================================================================
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
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
