/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary
        primary: 'var(--md-primary)',
        'on-primary': 'var(--md-on-primary)',
        'primary-container': 'var(--md-primary-container)',
        'on-primary-container': 'var(--md-on-primary-container)',
        'primary-fixed': 'var(--md-primary-fixed)',
        'on-primary-fixed': 'var(--md-on-primary-fixed)',
        'primary-fixed-dim': 'var(--md-primary-fixed-dim)',
        'on-primary-fixed-variant': 'var(--md-on-primary-fixed-variant)',

        // Secondary
        secondary: 'var(--md-secondary)',
        'on-secondary': 'var(--md-on-secondary)',
        'secondary-container': 'var(--md-secondary-container)',
        'on-secondary-container': 'var(--md-on-secondary-container)',
        'secondary-fixed': 'var(--md-secondary-fixed)',
        'on-secondary-fixed': 'var(--md-on-secondary-fixed)',
        'secondary-fixed-dim': 'var(--md-secondary-fixed-dim)',
        'on-secondary-fixed-variant': 'var(--md-on-secondary-fixed-variant)',

        // Tertiary
        tertiary: 'var(--md-tertiary)',
        'on-tertiary': 'var(--md-on-tertiary)',
        'tertiary-container': 'var(--md-tertiary-container)',
        'on-tertiary-container': 'var(--md-on-tertiary-container)',
        'tertiary-fixed': 'var(--md-tertiary-fixed)',
        'on-tertiary-fixed': 'var(--md-on-tertiary-fixed)',
        'tertiary-fixed-dim': 'var(--md-tertiary-fixed-dim)',
        'on-tertiary-fixed-variant': 'var(--md-on-tertiary-fixed-variant)',

        // Error
        error: 'var(--md-error)',
        'on-error': 'var(--md-on-error)',
        'error-container': 'var(--md-error-container)',
        'on-error-container': 'var(--md-on-error-container)',

        // Warning
        warning: 'var(--md-warning)',
        'on-warning-container': 'var(--md-on-warning-container)',
        'warning-container': 'var(--md-warning-container)',

        // Surface & Background
        surface: 'var(--md-surface)',
        'surface-dim': 'var(--md-surface-dim)',
        'surface-bright': 'var(--md-surface-bright)',
        'surface-container-lowest': 'var(--md-surface-container-lowest)',
        'surface-container-low': 'var(--md-surface-container-low)',
        'surface-container': 'var(--md-surface-container)',
        'surface-container-high': 'var(--md-surface-container-high)',
        'surface-container-highest': 'var(--md-surface-container-highest)',
        'surface-variant': 'var(--md-surface-variant)',
        'surface-tint': 'var(--md-surface-tint)',

        // On Surface
        'on-surface': 'var(--md-on-surface)',
        'on-surface-variant': 'var(--md-on-surface-variant)',
        'inverse-surface': 'var(--md-inverse-surface)',
        'inverse-on-surface': 'var(--md-inverse-on-surface)',
        'inverse-primary': 'var(--md-inverse-primary)',

        // Outline
        outline: 'var(--md-outline)',
        'outline-variant': 'var(--md-outline-variant)',

        // Background
        background: 'var(--md-surface)',
        'on-background': 'var(--md-on-surface)',

        // Legacy compatibility
        indigo: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
          400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
          800: '#3730a3', 900: '#312e81',
        },
        green: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d',
        },
        red: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
          800: '#991b1b', 900: '#7f1d1d',
        },
        purple: {
          50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
          400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
          800: '#6b21a8', 900: '#581c87',
        },
        yellow: {
          50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047',
          400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207',
          800: '#854d0e', 900: '#713f12',
        },
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'ambient': '0 20px 40px var(--md-shadow)',
        'card': '0 4px 20px var(--md-shadow)',
        'button': '0 8px 24px var(--md-shadow-strong)',
        'vault': '0 20px 40px var(--md-shadow-vault)',
      },
    },
  },
  plugins: [],
}
