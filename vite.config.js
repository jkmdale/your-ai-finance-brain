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
    exclude: ['@solana/wallet-standard-features'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      external: [],
      onwarn: () => {}
    }
  },
  server: {
    host: "::",
    port: 8080,
    fs: {
      strict: false
    }
  },
  esbuild: false
})