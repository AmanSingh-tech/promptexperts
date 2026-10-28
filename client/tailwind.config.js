/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        // Cool, slightly violet neutrals tuned for a dark arena UI (500+ keeps >=4.5:1 on 900).
        slate: {
          50: '#f6f7fb', 100: '#eceef6', 200: '#dadded', 300: '#c0c5dc', 400: '#a0a6c4',
          500: '#7a81a3', 600: '#4a5070', 700: '#2a2f48', 800: '#1a1d2e', 900: '#11131f', 950: '#090a11'
        },
        brand: {
          50: '#f3efff', 100: '#e6deff', 200: '#cdbdff', 300: '#ad94ff', 400: '#9775ff',
          500: '#8257ff', 600: '#7040f5', 700: '#5a2bd8', 800: '#4521a8', 900: '#2f1878'
        },
        neon: { 300: '#7cf0fb', 400: '#3fe3f2', 500: '#16c8da' },
        xp: { 300: '#d4f77a', 400: '#bdf043', 500: '#9fd81b' }
      },
      borderColor: ({ theme }) => ({ DEFAULT: theme('colors.slate.800') }),
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)'
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'grid-scroll': { from: { transform: 'translateY(0)' }, to: { transform: 'translateY(48px)' } }
      },
      animation: {
        rise: 'rise 300ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'grid-scroll': 'grid-scroll 3s linear infinite'
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
