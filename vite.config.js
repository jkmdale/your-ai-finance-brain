export default {
  resolve: {
    alias: {
      "@": "/dev-server/src"
    }
  },
  server: {
    host: "::",
    port: 8080
  },
  esbuild: {
    target: 'es2020'
  },
  build: {
    target: 'es2020'
  },
  define: {
    global: 'globalThis',
  }
}