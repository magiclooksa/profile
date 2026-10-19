import { defineConfig } from 'vite';

// Relative base so the built site works from any folder or sub-path.
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist' },
});
