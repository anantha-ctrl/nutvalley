/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette derived from the Beadsboutique logo
        gold: {
          DEFAULT: '#b8745a',  // rose-gold accent (buttons, highlights)
          light: '#dba58c',
          dark: '#8f4f3c',
        },
        // `ink` is the primary dark/brand colour — the logo's deep wine maroon
        ink: {
          DEFAULT: '#3a0d14',  // logo maroon, deepened for backgrounds
          soft: '#4f1520',
          line: '#6b2230',
        },
        forest: {
          DEFAULT: '#3a0d14',
          light: '#4f1520',
          deep: '#24070c',
        },
        sage: '#d9a3ae',       // dusty rose
        cream: '#fdf2f2',      // blush cream
        // Luxury landing palette (editorial / light theme)
        luxe: {
          bg: '#fbf4f2',      // soft blush backdrop
          ink: '#3a0d14',     // primary text = wine maroon
          gold: '#b8745a',    // accent = rose gold
          bronze: '#8f4f3c',  // secondary
          line: '#eedfdc',    // hairline dividers
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.18)',
        glow: '0 0 30px rgba(184,116,90,0.30)',
        luxe: '0 24px 60px -20px rgba(17,17,17,0.22)',
        'luxe-sm': '0 12px 30px -12px rgba(17,17,17,0.18)',
      },
      borderRadius: {
        luxe: '24px',
        'luxe-lg': '30px',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(120deg,#24070c 0%,#3a0d14 55%,#4f1520 100%)',
        'gold-sheen': 'linear-gradient(120deg,#b8745a 0%,#dba58c 45%,#8f4f3c 100%)',
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
