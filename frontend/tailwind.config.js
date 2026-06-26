/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f9fafb',
          sidebar: '#0a0a0a',
        },
      },
      keyframes: {
        loginKenBurns: {
          from: { transform: 'scale(1) translateX(0)' },
          to: { transform: 'scale(1.12) translateX(-4%)' },
        },
      },
      animation: {
        'login-ken-burns': 'loginKenBurns 10s linear forwards',
      },
    },
  },
  plugins: [],
};
