import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#111111',
        surface: '#1A1A1A',
        textPrimary: '#F2F2F2',
        backgroundLight: '#F5F5F5',
        surfaceLight: '#FFFFFF',
        textDark: '#111111',
        accent: '#D4AF37',
        danger: '#EF4444',
        mutedLight: '#E5E5E5',
        muted: '#2A2A2A',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(212, 175, 55, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
