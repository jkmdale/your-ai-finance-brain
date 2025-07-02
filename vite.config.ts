
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
    target: 'esnext',
    keepNames: true,
    jsx: 'automatic',
    include: /\.(tsx?|jsx?)$/,
    exclude: /node_modules/,
    tsconfig: false, // Completely bypass tsconfig
    tsconfigRaw: {
      compilerOptions: {
        target: 'esnext',
        lib: ['esnext', 'dom'],
        allowJs: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false, // Disable strict mode
        jsx: 'react-jsx',
        moduleResolution: 'node',
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true
      }
    }
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
