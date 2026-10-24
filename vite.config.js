import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is served from https://milkekhareedo.in/partners/
export default defineConfig({
  base: '/partners/',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
});
