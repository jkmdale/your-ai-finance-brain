import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react'
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
      "@parsers": path.resolve(process.cwd(), "./src/modules/import/parsers")
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@solana/wallet-standard-features']
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    host: "::",
    port: 8080,
    fs: {
      strict: false
    }
  }
})