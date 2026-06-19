/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E94560',
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d0d8',
          300: '#f4a8b5',
          400: '#ed778d',
          500: '#E94560',
          600: '#d42d4a',
          700: '#b2223b',
          800: '#951f34',
          900: '#7e1e30',
        },
        dark: {
          bg: '#1A1A2E',
          surface: '#16213E',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
};
