/**
 * FINPcoach — Restyling Grafico Totale (Sporty Blue & Orange)
 *
 * Palette:
 *  - Blu strutturali: #071A3D (900), #0A2A66 (800), #1457E0 (600), #1E6BFF (500), #4A8DFF (400), #8DB8FF (300), #E3EEFF (100)
 *  - Azzurro acqua accento: #22C8F0
 *  - Arancione CTA/Risultati: #E85D04 (600), #FF7A1A (500), #FF9A4D (400), #FFE9D6 (100)
 *  - Sfondo Dark: #071328
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface, #f4f7fe)',
        'surface-bright': 'var(--color-surface-bright, #ffffff)',
        'surface-dim': 'var(--color-surface-dim, #e2e8f0)',
        'surface-container-lowest': 'var(--color-surface-container-lowest, #ffffff)',
        'surface-container-low': 'var(--color-surface-container-low, #edf2fc)',
        'surface-container': 'var(--color-surface-container, #e2eaf8)',
        'surface-container-high': 'var(--color-surface-container-high, #d4e0f4)',
        'surface-container-highest': 'var(--color-surface-container-highest, #c4d4f0)',
        'surface-variant': 'var(--color-surface-variant, #d4e0f4)',
        background: 'var(--color-background, #f4f7fe)',
        'on-surface': 'var(--color-on-surface, #071A3D)',
        'on-surface-variant': 'var(--color-on-surface-variant, #475569)',
        'on-background': 'var(--color-on-background, #071A3D)',

        /* Primary: Deep sporty Blue */
        primary: '#0A2A66',
        'primary-container': '#1457E0',
        'on-primary': '#ffffff',
        'on-primary-container': '#ffffff',
        'primary-fixed': '#1E6BFF',
        'primary-fixed-dim': '#0A2A66',
        'on-primary-fixed': '#ffffff',

        /* Secondary: Aqua accent */
        secondary: '#22C8F0',
        'secondary-container': '#e0f7fc',
        'on-secondary': '#071A3D',
        'on-secondary-container': '#003642',

        /* Tertiary / CTA: Vibrant Athletic Orange */
        tertiary: '#FF7A1A',
        'tertiary-container': '#E85D04',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#ffffff',
        'tertiary-fixed': '#FFE9D6',
        'tertiary-fixed-dim': '#FF9A4D',
        'on-tertiary-fixed': '#3A1300',

        /* Semantic colors */
        success: '#10B981',
        'on-success': '#ffffff',
        'success-container': '#D1FAE5',
        warning: '#F59E0B',
        'on-warning': '#ffffff',
        'warning-container': '#FEF3C7',
        error: '#EF4444',
        'on-error': '#ffffff',
        'error-container': '#FEE2E2',
        info: '#3B82F6',

        /* Load zones A1/A2, B1/B2, Tecnica */
        'zone-a': '#3B82F6',
        'zone-b': '#10B981',
        'zone-c': '#F59E0B',
        'zone-tec': '#8B5CF6',

        outline: 'var(--color-outline, #cbd5e1)',
        'outline-variant': 'var(--color-outline-variant, #e2e8f0)',
      },

      borderRadius: {
        DEFAULT: '0.375rem',
        sm: '0.375rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        full: '9999px',
      },

      spacing: {
        gutter: 'clamp(0.75rem, 0.55rem + 0.9vw, 1.25rem)',
        'gutter-mobile': 'clamp(0.75rem, 0.55rem + 0.9vw, 1rem)',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.875rem',
        'space-lg': '1.25rem',
        'space-xl': '1.75rem',
        'tap': '48px',
        'tap-lg': '52px',
      },

      fontFamily: {
        sans: ["'Public Sans'", 'system-ui', 'sans-serif'],
        headline: ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        mono: ["ui-monospace", 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },

      fontSize: {
        'display-lg': ['clamp(28px, 1.1vw + 22px, 34px)', { lineHeight: '1.15', fontWeight: '700' }],
        'headline-lg': ['clamp(20px, 0.5vw + 17px, 24px)', { lineHeight: '1.2', fontWeight: '700' }],
        'headline-md': ['clamp(16px, 0.35vw + 15px, 19px)', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-sm': ['clamp(14px, 0.2vw + 13.5px, 16px)', { lineHeight: '1.35', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-base': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-bold': ['14px', { lineHeight: '20px', fontWeight: '700' }],
        'label-lg': ['13px', { lineHeight: '16px', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '14px', fontWeight: '700' }],
        'label-caps': ['11px', { lineHeight: '14px', fontWeight: '700' }],
      },

      boxShadow: {
        card: '0 2px 8px rgba(10, 42, 102, 0.06)',
        pop: '0 6px 20px rgba(10, 42, 102, 0.12)',
        float: '0 12px 32px rgba(10, 42, 102, 0.18)',
        'primary-sm': '0 2px 10px rgba(20, 87, 224, 0.25)',
        'primary-md': '0 6px 20px rgba(20, 87, 224, 0.35)',
        'orange-glow': '0 4px 16px rgba(255, 122, 26, 0.35)',
        nav: '0 -2px 16px rgba(10, 42, 102, 0.08)',
      },
    },
  },
  plugins: [],
}
