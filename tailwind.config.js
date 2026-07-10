/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Roboto Mono', 'Courier New', 'monospace'],
      },
      letterSpacing: {
        'wide': '0.025em',
        'wider': '0.05em',
      },
      colors: {
        // Clinical Dark Palette (Frostpunk-inspired)
        app: {
          bg: '#09090b',        // Zinc-950 - Background total
          surface: '#121214',   // Zinc-925 - Painéis de dados
          panel: '#18181b',     // Zinc-900 - Cards elevados
          border: '#27272a',    // Zinc-800 - Bordas de 1px
          hover: '#3f3f46',     // Zinc-700 - Hover states
        },
        text: {
          primary: '#e4e4e7',   // Zinc-200 - Leitura principal
          secondary: '#a1a1aa', // Zinc-400 - Labels
          dim: '#52525b',       // Zinc-600 - Unidades e hints
          disabled: '#3f3f46',  // Zinc-700 - Disabled
        },
        // Cores de Dados (Apenas gráficos/barras)
        data: {
          atp: '#eab308',       // Amarelo Ouro - Energia
          o2: '#ef4444',        // Vermelho Fosco - Arterial
          co2: '#3b82f6',       // Azul Técnico - Venoso
          ph: '#8b5cf6',        // Violeta - Equilíbrio Químico
          lactate: '#f97316',   // Laranja - Ácido Lático
          glucose: '#10b981',   // Verde - Glicose
        },
        // Estados Críticos
        status: {
          critical: '#dc2626',  // Vermelho intenso
          warning: '#f97316',   // Laranja
          normal: '#10b981',    // Verde técnico
          optimal: '#06b6d4',   // Cyan
        },
      },
      backgroundImage: {
        'scan-line': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px)',
      },
    },
  },
  plugins: [],
}
