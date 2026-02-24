import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    rollupOptions: {
      // Capacitor packages are mobile-only — externalize so web build doesn't fail
      external: (id) => id.startsWith('@capacitor/'),
    },
  },
});
