import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        '4xl': '2rem', // 32px
        '5xl': '2.5rem', // 40px
      },
      fontFamily: {
        sans: ['Padauk', 'sans-serif'],
      },
      colors: {
        primary: '#FF9AA2', // Soft Rose
        secondary: '#B5EAD7', // Soft Mint
        accent: '#C7CEEA', // Soft Periwinkle
        textDark: '#4A5568',
      },
      transitionTimingFunction: {
        'gooey': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'zoom-in': 'zoomIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        zoomIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [
    typography,
  ],
}