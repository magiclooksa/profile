// Bundles the server into server-dist/ (npm run build:server), so plain Node runs it: no TypeScript
// loader on the server, and no extra dependency.
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  publicDir: false,
  logLevel: 'warn',
  build: {
    ssr: true,
    target: 'node20',
    outDir: resolve(__dirname, '../server-dist'),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'main.ts'),
        setPassword: resolve(__dirname, 'scripts/setPassword.ts'),
      },
      output: { format: 'es', entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' },
    },
  },
});
