/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0A0A0F',
          card: '#111118',
          border: 'rgba(255,255,255,0.08)',
          accent: '#6C63FF',
          accentMint: '#00D4AA',
          accentCoral: '#FF6B6B',
          accentGold: '#FFD166',
          textPrimary: '#F0F0FF',
          textSecondary: '#8A8AA0',
          textMuted: '#4A4A60',
        },
        light: {
          bg: '#F8F8FF',
          card: '#FFFFFF',
          border: 'rgba(0,0,0,0.06)',
          accent: '#6C63FF',
          textPrimary: '#0A0A1A',
          textSecondary: '#5A5A7A',
          textMuted: '#9A9AAA',
        }
      },
      fontFamily: {
        sora: ['Sora-SemiBold'],
        soraBold: ['Sora-Bold'],
        inter: ['Inter-Regular'],
        interMedium: ['Inter-Medium'],
      }
    },
  },
  plugins: [],
}
