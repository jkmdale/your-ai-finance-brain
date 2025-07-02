// vite.config.ts override
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@parsers": path.resolve(__dirname, "./src/modules/import/parsers")
    },
  },
  esbuild: {
    target: 'es2020',
    keepNames: true,
  },
  define: {
    global: 'globalThis',
  },
})