/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        finanzar: {
          primary: '#1B2A4A',
          primaryHover: '#142038',
          accent: '#C89B3C',
          accentHover: '#B2872F',
          accentSubtle: '#F6EEDC',
          bg: '#F7F4EC',
          textMain: '#26262B',
          textSecondary: '#8B8478',
          textMuted: '#A39D92',
          positive: '#2F5FA8',
          positiveBg: '#EBF2FA',
          positiveBorder: '#C2D6EE',
          negative: '#B5502E',
          negativeBg: '#FDF1ED',
          negativeBorder: '#F0C4B6',
          surface: '#FFFDF8',
          surfaceHover: '#FDFBF4',
          surfaceMuted: '#F0EAE1',
          border: '#DBD3C2',
          borderSubtle: '#E8E2D5',
          borderStrong: '#8B8478',
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(27, 42, 74, 0.04)',
        DEFAULT: '0 4px 12px -2px rgba(27, 42, 74, 0.06), 0 2px 4px -1px rgba(27, 42, 74, 0.03)',
        md: '0 4px 12px -2px rgba(27, 42, 74, 0.06), 0 2px 4px -1px rgba(27, 42, 74, 0.03)',
        lg: '0 10px 24px -4px rgba(27, 42, 74, 0.08), 0 4px 8px -2px rgba(27, 42, 74, 0.04)',
        drawer: '0 -8px 24px -4px rgba(27, 42, 74, 0.12)',
      },
    },
  },
  plugins: [],
}

