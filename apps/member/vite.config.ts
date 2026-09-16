import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: path.resolve(import.meta.dirname, '../../public'),
  server: {
    port: 3000,
    host: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(import.meta.dirname, '../../packages/shared/src'),
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
