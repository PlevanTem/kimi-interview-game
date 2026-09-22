import { fileURLToPath } from 'node:url';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig } from 'vite';

// Markdown has no in-document charset declaration. Serve this UTF-8 source
// explicitly as readable text so browsers do not guess a legacy encoding.
function serveDesign(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const name=req.url?.split('?')[0].match(/^\/docs\/(EIGHT_ISLANDS(?:_DESIGN|_R2_SPEC|_R2_IMPLEMENTATION)\.md)$/)?.[1];
  if (!name) return next();
  const source=new URL('./docs/'+name,import.meta.url);
  if (!existsSync(source)) return next();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(readFileSync(source));
}

// The game lives in its own workspace but resolves dependencies from the
// repository root `node_modules`, so there is a single install and lockfile.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [{
    name: 'nostos-review-workbench',
    configureServer(server) { server.middlewares.use(serveDesign); },
    configurePreviewServer(server) { server.middlewares.use(serveDesign); },
    closeBundle() {
      const source = fileURLToPath(new URL('./docs/asset-library.html', import.meta.url));
      const target = fileURLToPath(new URL('./dist/docs/', import.meta.url));
      if (existsSync(source)) {
        mkdirSync(target, { recursive: true });
        copyFileSync(source, target + 'asset-library.html');
      }
    },
  }],
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
