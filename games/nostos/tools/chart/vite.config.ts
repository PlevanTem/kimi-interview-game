import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * 暂停面板研究页的构建配置。与资产库、天候试衣间同形：
 * 打成 IIFE 再内联成单文件，产物能直接双击打开——
 * 看设计的人不该先学会起一个服务器。
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
