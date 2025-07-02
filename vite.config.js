import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src")
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    host: "::",
    port: 8080
  }
})