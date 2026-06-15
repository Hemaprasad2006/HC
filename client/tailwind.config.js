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
        bg: {
          dark: '#0A0A0F',
          card: '#111118',
          light: '#F8F8FF',
          cardLight: '#FFFFFF',
        },
        accent: {
          primary: '#6C63FF',
          secondary: '#00D4AA',
          warm: '#FF6B6B',
          gold: '#FFD166',
        },
        text: {
          primary: '#F0F0FF',
          secondary: '#8A8AA0',
          muted: '#4A4A60',
          primaryLight: '#0A0A1A',
          secondaryLight: '#5A5A7A',
        }
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'input': '8px',
      },
      transitionTimingFunction: {
        'custom': 'cubic-bezier(0.4, 0, 0.2, 1)',
      }
    },
  },
  plugins: [],
}
