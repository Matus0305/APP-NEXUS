import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Asegura que las rutas arranquen desde la raíz
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
