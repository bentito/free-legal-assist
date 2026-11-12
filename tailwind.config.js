/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        legal: {
          bg: '#0B0F17',
          panel: '#111827',
          surface: '#1E293B',
          border: '#334155',
          gold: '#D97706',
          amber: '#F59E0B',
          crimson: '#DC2626',
          emerald: '#059669',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      spacing: {
        13: '3.25rem', // 52px
      },
    },
  },
  plugins: [],
};
