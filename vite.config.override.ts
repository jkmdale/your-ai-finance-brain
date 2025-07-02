// vite.config.ts override
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
      "@": path.resolve(__dirname, "./src"),
      "@parsers": path.resolve(__dirname, "./src/modules/import/parsers")
    },
  },
  esbuild: {
    target: 'es2022',
    keepNames: true,
    tsconfig: false, // Bypass corrupted tsconfig.json
    jsx: 'automatic'
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@solana/wallet-standard-features'],
    esbuildOptions: {
      target: 'es2022'
    }
  },
  build: {
    target: 'es2022',
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  server: {
    fs: {
      strict: false
    }
  }
})