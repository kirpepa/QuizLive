/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          '"Helvetica Neue"',
          '"Segoe UI"',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // VK brand blue scale (VKUI-inspired). 500 is the primary accent #0077FF.
        brand: {
          50: '#eaf3ff',
          100: '#d6e7ff',
          200: '#aecfff',
          300: '#7db3ff',
          400: '#4795ff',
          500: '#0077ff',
          600: '#0062d6',
          700: '#004fb0',
          800: '#003c86',
          900: '#002a5e',
        },
        // Neutral surfaces & text tuned to VK's UI.
        ink: '#000000',
        muted: '#6d7885', // VK secondary text
        line: '#e7e8ec', // hairline separators
        canvas: '#eff1f4', // page background
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 20, 51, 0.06)',
        'card-hover': '0 8px 24px rgba(0, 20, 51, 0.10)',
        header: '0 1px 0 rgba(0, 20, 51, 0.06)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
        'pop-in': 'pop-in 0.25s ease-out both',
      },
    },
  },
  plugins: [],
};
