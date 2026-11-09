/**
 * FINPcoach — Premium Tailwind Config
 *
 * Palette:
 *  Primary Blue:  #0f172a → #1e40af → #2563eb → #60a5fa → #93c5fd → #dbeafe
 *  Teal Accent:   #0d9488 / #ccfbf1
 *  Coral CTA:     #ea580c → #f97316 → #fb923c → #ffedd5
 *  Dark BG:       #0f172a
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
        /* Surfaces - via CSS vars */
        surface:                     'var(--color-surface, #f8fafc)',
        'surface-bright':            'var(--color-surface-bright, #ffffff)',
        'surface-dim':               'var(--color-surface-dim, #e2e8f0)',
        'surface-container-lowest':  'var(--color-surface-container-lowest, #ffffff)',
        'surface-container-low':     'var(--color-surface-container-low, #f1f5f9)',
        'surface-container':         'var(--color-surface-container, #e2e8f0)',
        'surface-container-high':    'var(--color-surface-container-high, #cbd5e1)',
        'surface-container-highest': 'var(--color-surface-container-highest, #94a3b8)',
        'surface-variant':           'var(--color-surface-variant, #e2e8f0)',
        background:                  'var(--color-background, #f8fafc)',
        'on-surface':                'var(--color-on-surface, #0f172a)',
        'on-surface-variant':        'var(--color-on-surface-variant, #475569)',
        'on-background':             'var(--color-on-background, #0f172a)',

        /* Primary — Rich Royal Blue */
        primary:                     'rgb(var(--color-primary-rgb) / <alpha-value>)',
        'primary-container':         'rgb(var(--color-primary-container-rgb) / <alpha-value>)',
        'on-primary':                'rgb(var(--color-on-primary-rgb) / <alpha-value>)',
        'on-primary-container':      'rgb(var(--color-on-primary-container-rgb) / <alpha-value>)',
        'primary-fixed':             'var(--color-primary-fixed, #60a5fa)',
        'primary-fixed-dim':         'var(--color-primary-fixed-dim, #3b82f6)',
        'on-primary-fixed':          'var(--color-on-primary-fixed, #ffffff)',
        'on-primary-fixed-variant':  'var(--color-on-primary-fixed-variant, #003cac)',
        'inverse-primary':           'var(--color-inverse-primary, #b5c4ff)',
        'primary-bright':            'var(--color-primary-bright, #2563eb)',

        /* Secondary — Teal */
        secondary:                   'rgb(var(--color-secondary-rgb, 13 148 136) / <alpha-value>)',
        'secondary-container':       'var(--color-secondary-container, #ccfbf1)',
        'on-secondary':              'var(--color-on-secondary, #ffffff)',
        'on-secondary-container':    'var(--color-on-secondary-container, #134e4a)',
        'secondary-fixed':           'var(--color-secondary-fixed, #89f5e7)',
        'secondary-fixed-dim':       'var(--color-secondary-fixed-dim, #6bd8cb)',
        'on-secondary-fixed':        'var(--color-on-secondary-fixed, #00201d)',
        'on-secondary-fixed-variant':'var(--color-on-secondary-fixed-variant, #005049)',

        /* Tertiary — Warm accent */
        tertiary:                    'rgb(var(--color-tertiary-rgb, 234 88 12) / <alpha-value>)',
        'tertiary-container':        'var(--color-tertiary-container, #ffedd5)',
        'on-tertiary':               'var(--color-on-tertiary, #ffffff)',
        'on-tertiary-container':     'var(--color-on-tertiary-container, #7c2d12)',
        'tertiary-fixed':            'var(--color-tertiary-fixed, #ffedd5)',
        'tertiary-fixed-dim':        'var(--color-tertiary-fixed-dim, #fdba74)',
        'on-tertiary-fixed':         'var(--color-on-tertiary-fixed, #370e00)',
        'on-tertiary-fixed-variant': 'var(--color-on-tertiary-fixed-variant, #7f2b00)',

        /* Status extra (design Stitch) */
        'status-live':               'var(--color-status-live, #10b981)',
        'status-alert':              'var(--color-status-alert, #ef4444)',
        'accent-gold':               'var(--color-accent-gold, #f59e0b)',
        'border-hairline':           'var(--color-border-hairline, #e2e7ff)',

        /* Semantic */
        success:                     '#059669',
        'on-success':                '#ffffff',
        'success-container':         '#d1fae5',
        'on-success-container':      '#065f46',
        warning:                     '#d97706',
        'on-warning':                '#ffffff',
        'warning-container':         '#fef3c7',
        'on-warning-container':      '#92400e',
        error:                       '#dc2626',
        'on-error':                  '#ffffff',
        'error-container':           '#fee2e2',
        'on-error-container':        '#991b1b',
        info:                        '#3b82f6',

        /* Zone colors (swim training zones) */
        'zone-a1':                   '#3b82f6',
        'zone-a2':                   '#0ea5e9',
        'zone-b1':                   '#10b981',
        'zone-b2':                   '#059669',
        'zone-c':                    '#f59e0b',
        'zone-tec':                  '#8b5cf6',

        /* Outline */
        outline:                     'var(--color-outline, #94a3b8)',
        'outline-variant':           'var(--color-outline-variant, #e2e8f0)',

        /* Inverse */
        'inverse-surface':           'var(--color-inverse-surface, #1e293b)',
        'inverse-on-surface':        'var(--color-inverse-on-surface, #f1f5f9)',
      },

      borderRadius: {
        DEFAULT:  '0.5rem',
        sm:       '0.5rem',
        md:       '0.75rem',
        lg:       '1rem',
        xl:       '1.25rem',
        '2xl':    '1.5rem',
        '3xl':    '2rem',
        full:     '9999px',
        card:     '20px',
        btn:      '14px',
      },

      spacing: {
        gutter:          'clamp(0.875rem, 0.6rem + 1vw, 1.5rem)',
        'gutter-mobile': 'clamp(0.75rem, 0.6rem + 0.8vw, 1rem)',
        'space-xs':      '0.25rem',
        'space-sm':      '0.5rem',
        'space-md':      '0.875rem',
        'space-lg':      '1.25rem',
        'space-xl':      '1.75rem',
        'margin':        '0.75rem',
        'margin-desktop':'1.5rem',
        'gutter-desktop':'1.25rem',
        'tap':           '48px',
        'tap-lg':        '56px',
        'sidebar':       '256px',
      },

      fontFamily: {
        sans:     ["'Public Sans'", 'system-ui', 'sans-serif'],
        headline: ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        mono:     ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        /* Alias retro-compatibili: nel markup storico esistono classi
           come font-body-bold, font-headline-sm e font-label-caps che
           altrimenti non generano nulla e facevano ereditare il font
           sbagliato. */
        'body-bold':    ["'Public Sans'", 'system-ui', 'sans-serif'],
        'body-base':    ["'Public Sans'", 'system-ui', 'sans-serif'],
        'body-lg':      ["'Public Sans'", 'system-ui', 'sans-serif'],
        'headline-sm':  ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'label-caps':   ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'display-lg-mobile': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'stat-timer':   ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'stat-timer-mobile': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display-lg':  ['clamp(28px, 1.1vw + 22px, 36px)', { lineHeight: '1.1', fontWeight: '700' }],
        'headline-lg': ['clamp(20px, 0.5vw + 17px, 26px)', { lineHeight: '1.2', fontWeight: '700' }],
        'headline-md': ['clamp(16px, 0.35vw + 14px, 20px)', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-sm': ['clamp(14px, 0.2vw + 13px, 17px)', { lineHeight: '1.35', fontWeight: '600' }],
        'body-lg':     ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'display-lg-mobile': ['28px', { lineHeight: '32px', letterSpacing: '-0.03em', fontWeight: '700' }],
        'stat-timer':  ['44px', { lineHeight: '48px', letterSpacing: '-0.04em', fontWeight: '700' }],
        'stat-timer-mobile': ['32px', { lineHeight: '36px', letterSpacing: '-0.03em', fontWeight: '700' }],
        'body-base':   ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-bold':   ['14px', { lineHeight: '20px', fontWeight: '700' }],
        'label-lg':    ['13px', { lineHeight: '16px', fontWeight: '600' }],
        'label-md':    ['12px', { lineHeight: '14px', fontWeight: '700' }],
        'label-caps':  ['11px', { lineHeight: '14px', fontWeight: '700', letterSpacing: '0.08em' }],
      },

      boxShadow: {
        card:         '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        pop:          '0 4px 16px rgba(0, 0, 0, 0.08)',
        float:        '0 12px 32px rgba(0, 0, 0, 0.12)',
        'primary-sm': '0 2px 8px rgba(59, 130, 246, 0.25)',
        'primary-md': '0 4px 16px rgba(59, 130, 246, 0.32)',
        'tertiary-glow':'0 4px 16px rgba(249, 115, 22, 0.35)',
        'tertiary-lg': '0 8px 24px rgba(249, 115, 22, 0.42)',
        nav:          '0 -1px 16px rgba(0, 0, 0, 0.06)',
        'inner-sm':   'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
      },

      backgroundImage: {
        'gradient-blue':   'var(--gradient-blue)',
        'gradient-orange': 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)',
        'gradient-teal':   'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
        'gradient-mesh':   'radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(249, 115, 22, 0.06) 0%, transparent 50%)',
      },

      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
        '350': '350ms',
      },

      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}
