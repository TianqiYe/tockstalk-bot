import { defineConfig } from 'vite'

export default defineConfig({
  // Root directory (where index.html is located)
  root: './',

  // Build output directory
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  // Development server configuration
  server: {
    port: 3000,
    // Proxy API requests to Flask backend
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
