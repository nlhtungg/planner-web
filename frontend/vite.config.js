import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Port của Backend
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3001', // WebSocket endpoint
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
    }
  }
})
