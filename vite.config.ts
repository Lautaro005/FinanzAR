import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Habilita source maps en el build de producción para poder depurar
    // errores reales del sitio publicado sin exponer el código minificado.
    sourcemap: true,
  },
})
