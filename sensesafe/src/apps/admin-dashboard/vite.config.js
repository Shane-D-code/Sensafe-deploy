import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  root: '.',
  css: {
    postcss: './postcss.config.js'
  },
  build: {
    outDir: '../../../dist/admin-dashboard'
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
    }
  }
})
