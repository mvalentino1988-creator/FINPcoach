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
        surface:                     'rgb(var(--color-surface-rgb, 248 250 252) / <alpha-value>)',
        'surface-bright':            'rgb(var(--color-surface-bright-rgb, 255 255 255) / <alpha-value>)',
        'surface-dim':               'rgb(var(--color-surface-dim-rgb, 226 232 240) / <alpha-value>)',
        'surface-container-lowest':  'rgb(var(--color-surface-container-lowest-rgb, 255 255 255) / <alpha-value>)',
        'surface-container-low':     'rgb(var(--color-surface-container-low-rgb, 241 245 249) / <alpha-value>)',
        'surface-container':         'rgb(var(--color-surface-container-rgb, 226 232 240) / <alpha-value>)',
        'surface-container-high':    'rgb(var(--color-surface-container-high-rgb, 203 213 225) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--color-surface-container-highest-rgb, 148 163 184) / <alpha-value>)',
        'surface-variant':           'rgb(var(--color-surface-variant-rgb, 226 232 240) / <alpha-value>)',
        background:                  'rgb(var(--color-background-rgb, 248 250 252) / <alpha-value>)',
        'on-surface':                'rgb(var(--color-on-surface-rgb, 15 23 42) / <alpha-value>)',
        'on-surface-variant':        'rgb(var(--color-on-surface-variant-rgb, 71 85 105) / <alpha-value>)',
        'on-background':             'rgb(var(--color-on-background-rgb, 15 23 42) / <alpha-value>)',

        /* Primary — Rich Royal Blue */
        primary:                     'rgb(var(--color-primary-rgb) / <alpha-value>)',
        'primary-container':         'rgb(var(--color-primary-container-rgb) / <alpha-value>)',
        'on-primary':                'rgb(var(--color-on-primary-rgb) / <alpha-value>)',
        'on-primary-container':      'rgb(var(--color-on-primary-container-rgb) / <alpha-value>)',
        'primary-fixed':             'rgb(var(--color-primary-fixed-rgb, 96 165 250) / <alpha-value>)',
        'primary-fixed-dim':         'rgb(var(--color-primary-fixed-dim-rgb, 59 130 246) / <alpha-value>)',
        'on-primary-fixed':          'rgb(var(--color-on-primary-fixed-rgb, 255 255 255) / <alpha-value>)',
        'on-primary-fixed-variant':  'rgb(var(--color-on-primary-fixed-variant-rgb, 0 60 172) / <alpha-value>)',
        'inverse-primary':           'rgb(var(--color-inverse-primary-rgb, 181 196 255) / <alpha-value>)',
        'primary-bright':            'rgb(var(--color-primary-bright-rgb, 37 99 235) / <alpha-value>)',

        /* Secondary — Teal */
        secondary:                   'rgb(var(--color-secondary-rgb, 13 148 136) / <alpha-value>)',
        'secondary-container':       'rgb(var(--color-secondary-container-rgb, 204 251 241) / <alpha-value>)',
        'on-secondary':              'rgb(var(--color-on-secondary-rgb, 255 255 255) / <alpha-value>)',
        'on-secondary-container':    'rgb(var(--color-on-secondary-container-rgb, 19 78 74) / <alpha-value>)',
        'secondary-fixed':           'rgb(var(--color-secondary-fixed-rgb, 137 245 231) / <alpha-value>)',
        'secondary-fixed-dim':       'rgb(var(--color-secondary-fixed-dim-rgb, 107 216 203) / <alpha-value>)',
        'on-secondary-fixed':        'rgb(var(--color-on-secondary-fixed-rgb, 0 32 29) / <alpha-value>)',
        'on-secondary-fixed-variant':'rgb(var(--color-on-secondary-fixed-variant-rgb, 0 80 73) / <alpha-value>)',

        /* Tertiary — Warm accent */
        tertiary:                    'rgb(var(--color-tertiary-rgb, 234 88 12) / <alpha-value>)',
        'tertiary-container':        'rgb(var(--color-tertiary-container-rgb, 255 237 213) / <alpha-value>)',
        'on-tertiary':               'rgb(var(--color-on-tertiary-rgb, 255 255 255) / <alpha-value>)',
        'on-tertiary-container':     'rgb(var(--color-on-tertiary-container-rgb, 124 45 18) / <alpha-value>)',
        'tertiary-fixed':            'rgb(var(--color-tertiary-fixed-rgb, 255 237 213) / <alpha-value>)',
        'tertiary-fixed-dim':        'rgb(var(--color-tertiary-fixed-dim-rgb, 253 186 116) / <alpha-value>)',
        'on-tertiary-fixed':         'rgb(var(--color-on-tertiary-fixed-rgb, 55 14 0) / <alpha-value>)',
        'on-tertiary-fixed-variant': 'rgb(var(--color-on-tertiary-fixed-variant-rgb, 127 43 0) / <alpha-value>)',

        /* Status extra (design Stitch) */
        'status-live':               'rgb(var(--color-status-live-rgb, 16 185 129) / <alpha-value>)',
        'status-alert':              'rgb(var(--color-status-alert-rgb, 239 68 68) / <alpha-value>)',
        'accent-gold':               'rgb(var(--color-accent-gold-rgb, 245 158 11) / <alpha-value>)',
        'border-hairline':           'rgb(var(--color-border-hairline-rgb, 226 231 255) / <alpha-value>)',

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

        /* ACWR livelli semantici */
        'acwr-ok':                   '#059669',
        'acwr-attenzione':           '#d97706',
        'acwr-critico':              '#dc2626',

        /* Outline */
        outline:                     'rgb(var(--color-outline-rgb, 148 163 184) / <alpha-value>)',
        'outline-variant':           'rgb(var(--color-outline-variant-rgb, 226 232 240) / <alpha-value>)',

        /* Inverse */
        'inverse-surface':           'rgb(var(--color-inverse-surface-rgb, 30 41 59) / <alpha-value>)',
        'inverse-on-surface':        'rgb(var(--color-inverse-on-surface-rgb, 241 245 249) / <alpha-value>)',
      },

      borderRadius: {
        DEFAULT:  '0.25rem',
        sm:       '0.25rem',
        md:       '0.375rem',
        lg:       '0.5rem',
        xl:       '0.75rem',
        '2xl':    '1rem',
        '3xl':    '1.5rem',
        full:     '9999px',
        card:     '16px',
        btn:      '12px',
      },

      spacing: {
        gutter:          '1rem',
        'gutter-mobile': '0.75rem',
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
        sans:     ["'Inter'", "'Public Sans'", 'system-ui', 'sans-serif'],
        headline: ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        mono:     ["'JetBrains Mono'", 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        /* Alias retro-compatibili: nel markup storico esistono classi
           come font-body-bold, font-headline-sm e font-label-caps che
           altrimenti non generano nulla e facevano ereditare il font
           sbagliato. */
        'body-bold':    ["'Inter'", "'Public Sans'", 'system-ui', 'sans-serif'],
        'body-base':    ["'Inter'", "'Public Sans'", 'system-ui', 'sans-serif'],
        'body-lg':      ["'Inter'", "'Public Sans'", 'system-ui', 'sans-serif'],
        'body-sm':      ["'Inter'", "'Public Sans'", 'system-ui', 'sans-serif'],
        'body-md':      ["'Inter'", "'Public Sans'", 'system-ui', 'sans-serif'],
        'headline-sm':  ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'headline-md':  ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'label-caps':   ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'label-sm':     ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'label-md':     ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'label-lg':     ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'title-md':     ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'telemetry-sm': ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
        'telemetry-md': ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
        'display-timer': ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
        'display-timer-mobile': ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
        'display-stopwatch': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'display-stopwatch-mobile': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'display-lg-mobile': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'stat-timer':   ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        'stat-timer-mobile': ["'Space Grotesk'", 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display-lg':  ['clamp(28px, 1.1vw + 22px, 36px)', { lineHeight: '1.1', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['22px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'title-md':    ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg':     ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md':     ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-base':   ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm':     ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'body-bold':   ['14px', { lineHeight: '20px', fontWeight: '700' }],
        'display-timer': ['56px', { lineHeight: '60px', letterSpacing: '-0.04em', fontWeight: '700' }],
        'display-timer-mobile': ['44px', { lineHeight: '48px', letterSpacing: '-0.03em', fontWeight: '700' }],
        'telemetry-md': ['16px', { lineHeight: '22px', letterSpacing: '0.02em', fontWeight: '500' }],
        'telemetry-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '500' }],
        'label-lg':    ['14px', { lineHeight: '20px', letterSpacing: '0.04em', fontWeight: '600' }],
        'label-md':    ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
        'label-sm':    ['10px', { lineHeight: '14px', letterSpacing: '0.08em', fontWeight: '700' }],
        'label-caps':  ['11px', { lineHeight: '14px', fontWeight: '700', letterSpacing: '0.08em' }],
        'display-lg-mobile': ['28px', { lineHeight: '32px', letterSpacing: '-0.03em', fontWeight: '700' }],
        'stat-timer':  ['44px', { lineHeight: '48px', letterSpacing: '-0.04em', fontWeight: '700' }],
        'stat-timer-mobile': ['32px', { lineHeight: '36px', letterSpacing: '-0.03em', fontWeight: '700' }],
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
