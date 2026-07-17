/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e6eaf2',
          100: '#b3bfd9',
          200: '#8094bf',
          300: '#4d69a6',
          400: '#1a3e8c',
          500: '#0A1628',
          600: '#081220',
          700: '#060d18',
          800: '#040910',
          900: '#020408',
          DEFAULT: '#0A1628',
        },
        gold: {
          50: '#fef9ee',
          100: '#fdf0d0',
          200: '#fae1a1',
          300: '#f7d072',
          400: '#f5c043',
          500: '#F5A623',
          600: '#d4891c',
          700: '#b36c15',
          800: '#92500e',
          900: '#713307',
          DEFAULT: '#F5A623',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float 8s ease-in-out 1s infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-in',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 166, 35, 0.4)' },
          '50%': { boxShadow: '0 0 0 15px rgba(245, 166, 35, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #0A1628 0%, #1a2f4e 50%, #0A1628 100%)',
        'gradient-gold': 'linear-gradient(135deg, #F5A623 0%, #f7d072 50%, #F5A623 100%)',
        'gradient-hero': 'linear-gradient(135deg, #0A1628 0%, #0f2040 40%, #1a3050 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
