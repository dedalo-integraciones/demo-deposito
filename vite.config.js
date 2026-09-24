import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  esbuild: {
    legalComments: 'none',
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2,
        drop_debugger: true,
        pure_funcs: ['console.debug'],
      },
      format: {
        comments: false,
      },
      mangle: {
        safari10: true,
      },
    },
    cssMinify: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase/auth')) {
            return 'firebase-auth'
          }
          if (id.includes('firebase/storage')) {
            return 'firebase-storage'
          }
          if (id.includes('firebase/firestore') || id.includes('firebase/app')) {
            return 'firebase-firestore'
          }
          if (id.includes('react-markdown')) {
            return 'markdown'
          }
          if (id.includes('lucide-react')) {
            return 'icons'
          }
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})
