import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * 资产库的构建配置。
 *
 * 和游戏本体的区别只有一个：这里要产出**一个可以直接双击打开的 HTML**。
 * 所以打成 IIFE 而不是 ES module——从 file:// 打开时浏览器会拒绝加载
 * type="module" 的脚本（CORS），而 IIFE 没有这个限制。
 * 打包完由 build.mjs 把 JS 与 CSS 内联进 HTML，输出单文件。
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
        // 单文件产物，不要 code splitting
        inlineDynamicImports: true,
        entryFileNames: 'bundle.js',
        assetFileNames: 'bundle.[ext]',
      },
    },
  },
});
