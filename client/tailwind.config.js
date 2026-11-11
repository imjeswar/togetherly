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
        togetherly: {
          bg: '#0D0B10',
          bgSecondary: '#17131C',
          card: '#211B27',
          cardHover: '#2A2332',
          rose: '#E8A0A8',
          roseLight: '#F3C4CB',
          roseDark: '#C77983',
          gold: '#D9B77E',
          goldLight: '#E8CE9D',
          text: '#FFF8F5',
          textMuted: '#B9AEB9',
          border: 'rgba(255, 255, 255, 0.08)',
          borderLight: 'rgba(255, 255, 255, 0.15)',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'glow-rose': '0 0 25px -5px rgba(232, 160, 168, 0.3)',
        'glow-gold': '0 0 25px -5px rgba(217, 183, 126, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'flicker': 'flicker 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.85, transform: 'scale(1.02)' },
        },
        flicker: {
          '0%, 100%': { opacity: 1 },
          '25%': { opacity: 0.9 },
          '50%': { opacity: 1 },
          '75%': { opacity: 0.85 },
        }
      }
    },
  },
  plugins: [],
}
