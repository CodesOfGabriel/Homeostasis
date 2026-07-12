/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0b0f17',
        foreground: '#e6e8ec',
        card: '#1f2836',
        muted: '#374151',
        'muted-foreground': '#929ba9',
        primary: '#d9b45f',
        teal: '#55b7bd',
        cyan: '#58bdd0',
        danger: '#dc6658',
        good: '#55be83',
        warning: '#e2a54f',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Cinzel', 'ui-serif', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
