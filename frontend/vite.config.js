import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api is proxied to the Express server so the browser stays same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
    },
  },
});
