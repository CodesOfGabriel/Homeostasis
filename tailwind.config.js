/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neuro': {
          dark: '#0a0e27',
          blue: '#1e3a8a',
          cyan: '#06b6d4',
          purple: '#7c3aed',
          red: '#dc2626',
          green: '#10b981',
        },
        'game': {
          bg: '#000000',
          panel: '#0a0a0a',
          border: '#1a1a2e',
          cyan: '#00f3ff',
          purple: '#b026ff',
          red: '#ff0055',
          yellow: '#ffaa00',
          green: '#00ff88',
          blue: '#0066ff',
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 243, 255, 0.5)',
        'neon-purple': '0 0 20px rgba(176, 38, 255, 0.5)',
        'neon-red': '0 0 20px rgba(255, 0, 85, 0.5)',
      }
    },
  },
  plugins: [],
}
