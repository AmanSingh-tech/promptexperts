/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.ts'],
  darkMode: 'class',
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        // Cool grey neutrals on a near-white page. 500+ keeps >=4.5:1 on white and on 50.
        slate: {
          50: '#f3f7f7', 100: '#e7eeef', 200: '#d6dfe2', 300: '#b8c4ca', 400: '#8d9ca4',
          500: '#5f6f78', 600: '#4f5e67', 700: '#39424e', 800: '#2a333d', 900: '#1c2530', 950: '#0e141e'
        },
        // Green accent. 600 is the lightest shade that keeps white text at >=4.5:1.
        brand: {
          50: '#ecf9f1', 100: '#d3f1de', 200: '#a8e3bf', 300: '#6fd09a', 400: '#39bf6f',
          500: '#1ba94c', 600: '#15803d', 700: '#116b33', 800: '#0e5529', 900: '#0b4522'
        }
      },
      borderColor: ({ theme }) => ({ DEFAULT: theme('colors.slate.200') }),
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)'
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } }
      },
      animation: {
        rise: 'rise 300ms cubic-bezier(0.23, 1, 0.32, 1) both'
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
