import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Relative asset paths for WebView / APK / file:// compatibility
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});

