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
        // Premium automotive/mechanic inspired theme colors
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Amber (matches grease/oils/industrial engine)
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        darkbg: {
          50: '#1f2937',
          100: '#111827', // Deep background
          200: '#0f172a',
          300: '#1e293b', // Card background
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        lightning: {
          '0%': { transform: 'translateY(-120%)', opacity: '0' },
          '8%': { opacity: '1' },
          '35%': { opacity: '0.2' },
          '55%': { opacity: '0.8' },
          '70%': { opacity: '0' },
          '100%': { transform: 'translateY(120%)', opacity: '0' }
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' }
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.8s ease-out both',
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        lightning: 'lightning 3.2s ease-in infinite',
        'gradient-shift': 'gradientShift 4s ease infinite',
        blink: 'blink 1.4s ease-in-out infinite'
      }
    },
  },
  plugins: [],
}
