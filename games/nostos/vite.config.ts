import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The game lives in its own workspace but resolves dependencies from the
// repository root `node_modules`, so there is a single install and lockfile.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 1200,
  },
  server: { host: '127.0.0.1', port: 4175 },
  preview: { host: '127.0.0.1', port: 4175 },
});
