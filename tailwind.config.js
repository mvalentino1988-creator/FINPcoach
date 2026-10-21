/**
 * FINPcoach — Design System "Aquatic Paralympic"
 * Token set allineato a Stitch (aquatic_paralympic_coaching_system / DESIGN.md).
 *
 * Regole d'uso:
 *  - Colori: SEMANTICI (bg-surface-container-lowest, text-on-surface-variant, ...).
 *    Non usare le scale slate/gray: la palette e' calibrata per glare di vasca e WCAG AAA.
 *  - Tipografia: i token `label-*` (caps) per metadati densi (classi S9, record ITA),
 *    `headline-*` per titoli, `body-*` per testo corrente e descrizioni esercizi.
 *  - Spaziatura: ritmo modulare 4/8px (space-xs .25 / space-sm .5 / space-md 1 / space-lg 1.5).
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ---- Superfici (architettura a 5 livelli) ---- */
        surface: '#faf8ff',
        'surface-bright': '#faf8ff',
        'surface-dim': '#d2d9f4',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f3ff',
        'surface-container': '#eaedff',
        'surface-container-high': '#e2e7ff',
        'surface-container-highest': '#dae2fd',
        'surface-variant': '#dae2fd',
        'surface-tint': '#016874',
        background: '#faf8ff',
        'on-surface': '#131b2e',
        'on-surface-variant': '#3f484a',
        'on-background': '#131b2e',

        /* ---- Primary: Deep Aquatic Teal ---- */
        primary: '#004e58',
        'primary-container': '#006874',
        'on-primary': '#ffffff',
        'on-primary-container': '#97e4f2',
        'primary-fixed': '#a2effd',
        'primary-fixed-dim': '#85d2e0',
        'on-primary-fixed': '#001f24',
        'on-primary-fixed-variant': '#004f58',
        'inverse-primary': '#85d2e0',

        /* ---- Secondary: Olympic Deep Blue ---- */
        secondary: '#006399',
        'secondary-container': '#7ec2fd',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#004f7b',
        'secondary-fixed': '#cde5ff',
        'secondary-fixed-dim': '#95ccff',
        'on-secondary-fixed': '#001d32',
        'on-secondary-fixed-variant': '#004a75',

        /* ---- Tertiary: Athletic Coral ---- */
        tertiary: '#793000',
        'tertiary-container': '#9e4202',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#ffceb7',
        'tertiary-fixed': '#ffdbcb',
        'tertiary-fixed-dim': '#ffb692',
        'on-tertiary-fixed': '#341100',
        'on-tertiary-fixed-variant': '#793000',

        /* ---- Error / Inverse / Outline ---- */
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        'inverse-surface': '#283044',
        'inverse-on-surface': '#eef0ff',
        outline: '#6f797b',
        'outline-variant': '#bec8ca',
      },

      borderRadius: {
        DEFAULT: '0.25rem',
        sm: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },

      spacing: {
        gutter: '1rem',
        'gutter-mobile': '0.75rem',
        margin: '1.5rem',
        'margin-mobile': '1rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        /* Riferimenti rapidi per i tap target poolside */
        'tap': '48px',
        'tap-lg': '52px',
      },

      fontFamily: {
        sans: ["'Public Sans'", 'system-ui', 'sans-serif'],
        'body-base': ["'Public Sans'", 'system-ui', 'sans-serif'],
        'body-bold': ["'Public Sans'", 'system-ui', 'sans-serif'],
        'body-lg': ["'Public Sans'", 'system-ui', 'sans-serif'],
        'headline-sm': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'headline-md': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'headline-lg': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'headline-lg-mobile': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'display-lg': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'label-lg': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'label-md': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'label-caps': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        mono: ["ui-monospace", 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },

      fontSize: {
        'display-lg': ['32px', { lineHeight: '38px', fontWeight: '700' }],
        'headline-lg': ['24px', { lineHeight: '30px', fontWeight: '700' }],
        'headline-lg-mobile': ['20px', { lineHeight: '26px', fontWeight: '700' }],
        'headline-md': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'headline-sm': ['16px', { lineHeight: '22px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-base': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-bold': ['14px', { lineHeight: '20px', fontWeight: '700' }],
        'label-lg': ['13px', { lineHeight: '16px', fontWeight: '600' }],
        'label-md': ['11px', { lineHeight: '14px', fontWeight: '700' }],
        'label-caps': ['10px', { lineHeight: '14px', fontWeight: '700' }],
      },

      boxShadow: {
        /* Level 1 — card: micro-ombra + hairline (nessun blur pesante) */
        card: '0 1px 2px rgba(15, 23, 42, 0.05)',
        /* Level 2 — popover / bottom sheet */
        pop: '0 4px 12px rgba(15, 23, 42, 0.08)',
        /* Level 3 — dialog / FAB */
        float: '0 8px 24px rgba(15, 23, 42, 0.12)',
        'primary-sm': '0 2px 8px rgba(0, 104, 116, 0.20)',
        'primary-md': '0 4px 14px rgba(0, 104, 116, 0.25)',
        nav: '0 -1px 12px rgba(0, 0, 0, 0.06)',
      },

      screens: {
        xs: '380px',
      },
    },
  },
  plugins: [],
}
