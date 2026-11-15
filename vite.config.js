import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api se reenvía a Django (evita problemas de CORS).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'https://pos-backend-rho-two.vercel.app', changeOrigin: true },
    },
  },
});
