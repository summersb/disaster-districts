import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    devtools(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  server: {
    host: true,
    allowedHosts: true,
    // Lets the dev server on :5173 be used directly, matching nginx's
    // /api/* -> backend route. In Docker the backend is reachable as
    // "backend"; outside Docker set VITE_API_PROXY (e.g. http://localhost:9090).
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://backend:8080',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('pdfjs-dist/build/pdf.worker')) return 'pdfjs-worker'
        },
      },
    },
  },
})
