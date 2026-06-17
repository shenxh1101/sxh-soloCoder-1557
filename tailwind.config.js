/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: '#FFF7F0',
          100: '#FFE8D6',
          200: '#FFD4AD',
          300: '#FFB784',
          400: '#FF9C57',
          500: '#FF8C42',
          600: '#FF7A2E',
          700: '#FF6B1F',
          800: '#E65A10',
          900: '#CC4A05',
        },
        warm: {
          50: '#FFFDF8',
          100: '#FFF9ED',
          200: '#FFF5E6',
          300: '#FFE8CC',
          400: '#FFD9A8',
          500: '#F5DEB3',
        },
        brown: {
          50: '#F7F3F0',
          100: '#E8DED6',
          200: '#D4C4B8',
          300: '#B8A594',
          400: '#8D6E63',
          500: '#5D4037',
          600: '#4E342E',
          700: '#3E2723',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
};
