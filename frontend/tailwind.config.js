/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary:  { DEFAULT: '#6366f1', 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
        accent:   { DEFAULT: '#06b6d4', 50: '#ecfeff', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2' },
        surface:  { DEFAULT: '#0f0f1a', 50: '#1a1a2e', 100: '#16213e', 200: '#1e1b4b', card: '#13131f', border: '#2d2d4e' },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient':   'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan':       'scan 2s linear infinite',
        'float':      'float 3s ease-in-out infinite',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'slide-up':   'slideUp 0.5s ease-out',
        'fade-in':    'fadeIn 0.4s ease-out',
      },
      keyframes: {
        scan:    { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        float:   { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        glow:    { 'from': { boxShadow: '0 0 20px rgba(99,102,241,0.3)' }, 'to': { boxShadow: '0 0 40px rgba(99,102,241,0.7)' } },
        slideUp: { 'from': { opacity: '0', transform: 'translateY(20px)' }, 'to': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:  { 'from': { opacity: '0' }, 'to': { opacity: '1' } },
      },
      boxShadow: {
        'glow-primary': '0 0 30px rgba(99,102,241,0.4)',
        'glow-accent':  '0 0 30px rgba(6,182,212,0.4)',
        'glass':        '0 8px 32px rgba(0,0,0,0.4)',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
