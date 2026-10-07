/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eefdf5',
          100: '#d5f9e8',
          200: '#b0f1d4',
          300: '#7ce4ba',
          400: '#41cf98',
          500: '#1cb57a',
          600: '#109363',
          700: '#0f7551',
          800: '#105c42',
          900: '#0e4c37',
          950: '#062b1e',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d4d9e1',
          300: '#aab4c4',
          400: '#7c899f',
          500: '#5b6a83',
          600: '#46536b',
          700: '#3a4458',
          800: '#323949',
          900: '#1d2230',
          950: '#0f1219',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,18,25,0.08), 0 1px 2px rgba(15,18,25,0.06)',
        'card-hover': '0 8px 25px rgba(15,18,25,0.12), 0 3px 8px rgba(15,18,25,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
