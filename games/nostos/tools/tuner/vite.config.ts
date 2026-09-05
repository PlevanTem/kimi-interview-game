import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * 天候试衣间的构建配置。与资产库同形：打成 IIFE 再内联成单文件，
 * 好让产物能直接双击打开——调光的人不该先学会起一个服务器。
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'bundle.js',
        assetFileNames: 'bundle.[ext]',
      },
    },
  },
});
