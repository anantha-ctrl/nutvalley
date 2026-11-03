/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette derived from the NutValley logo
        gold: {
          DEFAULT: '#c9971c',  // logo mustard gold (buttons, highlights)
          light: '#e3bd5b',
          dark: '#9c7414',
        },
        // `ink` is the primary dark/brand colour — the logo's deep forest green
        ink: {
          DEFAULT: '#1a4d23',  // logo green, deepened for backgrounds
          soft: '#23602e',
          line: '#2f7a3b',
        },
        forest: {
          DEFAULT: '#1a4d23',
          light: '#23602e',
          deep: '#0f3316',
        },
        navy: {
          DEFAULT: '#1d2f74',  // logo butterfly / tagline navy
          light: '#2c43a0',
          deep: '#131f4f',
        },
        sage: '#a9c98a',       // leaf green
        cream: '#fbf5e6',      // logo cream
        // Luxury landing palette (editorial / light theme)
        luxe: {
          bg: '#fbf6ea',      // logo cream backdrop
          ink: '#1a4d23',     // primary text = forest green
          gold: '#c9971c',    // accent = mustard gold
          bronze: '#1d2f74',  // secondary = navy
          line: '#ece2c6',    // hairline dividers
          cream: '#fcf3e4',   // logo background — used for hover states
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.18)',
        glow: '0 0 30px rgba(201,151,28,0.30)',
        luxe: '0 24px 60px -20px rgba(17,17,17,0.22)',
        'luxe-sm': '0 12px 30px -12px rgba(17,17,17,0.18)',
      },
      borderRadius: {
        luxe: '24px',
        'luxe-lg': '30px',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(120deg,#0f3316 0%,#1a4d23 55%,#23602e 100%)',
        'gold-sheen': 'linear-gradient(120deg,#c9971c 0%,#e3bd5b 45%,#9c7414 100%)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-40px) scale(1.1)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.95)' },
        },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        blob: 'blob 18s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out both',
        'scale-in': 'scaleIn 0.4s ease-out both',
        'slide-in-right': 'slideInRight 0.4s ease-out both',
        'count-up': 'countUp 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
