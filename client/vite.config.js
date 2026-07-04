import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In local development the vite dev server proxies /api to the backend;
// in Docker the same role is played by nginx (see nginx.conf), so the app
// code always talks to a same-origin /api.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
  },
});
