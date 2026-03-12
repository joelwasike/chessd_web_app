import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy chess libs into their own chunk (loaded only on game page)
          chess: ['chess.js', 'react-chessboard'],
          // Vendor chunk for react core
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
