/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: 'var(--color-primary, #1DB954)',
          black: 'var(--color-secondary, #191414)',
          dark: 'var(--color-background, #121212)',
          gray: 'var(--color-surface, #282828)',
          lightgray: 'var(--color-text-secondary, #B3B3B3)',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}