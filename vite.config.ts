
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
    jsx: 'automatic',
    include: /\.(tsx?|jsx?)$/,
    exclude: /node_modules/,
    tsconfig: false // Bypass corrupted tsconfig.json
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
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  server: {
    host: "::",
    port: 8080,
    fs: {
      strict: false
    }
  }
})
