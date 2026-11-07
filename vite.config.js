// Vite configuration for React + Vite.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 so the dev server also works inside containers / online previews.
    host: '0.0.0.0',
    port: 5173,
    // Allow the preview host used by online sandboxes.
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
