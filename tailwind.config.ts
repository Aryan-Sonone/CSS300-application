import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  // next-monorepo is a separate Next.js scaffold living inside src/ — excluded
  // so its classes aren't emitted into this bundle.
  content: ['./index.html', './src/**/*.{ts,tsx}', '!./src/next-monorepo/**'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        text: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          hover: 'rgb(var(--c-accent-hover) / <alpha-value>)',
        },
        // The decay ramp: truth -> mid -> decay
        truth: 'rgb(var(--c-truth) / <alpha-value>)',
        mid: 'rgb(var(--c-mid) / <alpha-value>)',
        decay: 'rgb(var(--c-decay) / <alpha-value>)',
        thinking: 'rgb(var(--c-thinking) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: { lg: '8px', md: '6px', sm: '4px', xl: '12px' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.08)',
        lift: '0 8px 24px rgb(0 0 0 / 0.18)',
        focus: '0 0 0 3px rgb(var(--c-accent) / 0.35)',
      },
      maxWidth: { container: '72rem' },
      transitionTimingFunction: { app: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulseDot: { '0%,100%': { opacity: '0.45' }, '50%': { opacity: '1' } },
      },
      animation: { shimmer: 'shimmer 1.6s infinite', pulseDot: 'pulseDot 2s ease-in-out infinite' },
    },
  },
  plugins: [],
} satisfies Config
