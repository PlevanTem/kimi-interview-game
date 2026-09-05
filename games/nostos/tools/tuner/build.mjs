/**
 * 把 vite 的产物合成一个自包含的 HTML。
 *
 * 为什么要合成单文件：审阅素材的人应该能把这一个文件发给别人、
 * 或者双击直接打开——不需要起服务器，也不需要带着一个 assets/ 目录。
 * 游戏本体没有这个需求（它由 Pages 托管），所以只有这个工具这么打。
 */
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');
const out = join(here, '..', '..', 'docs', 'env-tuner.html');

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const js = readFileSync(join(dist, 'bundle.js'), 'utf8');
const cssPath = join(dist, 'bundle.css');
const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';

// </script> 出现在字符串字面量里会提前终止 script 标签
const safeJs = js.replaceAll('</script>', '<\\/script>');

// 注意：replace 的第二个参数必须传**函数**，不能传字符串。
// 传字符串时 $& / $` / $' / $1 会被当成替换模式展开，而压缩后的 JS
// 里几乎一定含有这些序列——那会把原始 HTML 片段splice回产物中间，
// 生成一个看似成功、实际坏掉的文件。函数形式没有这个展开行为。
// 脚本必须落在 </body> 之前，不能留在 <head> 里。
// vite 原本发的是 type="module"，它隐含 defer，会等 DOM 建好再跑；
// 内联之后是一段普通脚本，留在 head 里会在 <body> 存在之前就执行，
// document.getElementById('app') 直接拿到 null。
const merged = html
  .replace(/<link rel="stylesheet"[^>]*>/, () => (css ? `<style>\n${css}\n</style>` : ''))
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>\s*/, () => '')
  .replace(/<\/body>/, () => `  <script>\n${safeJs}\n  </script>\n  </body>`);

if (merged.includes('src="') || merged.includes('<link rel="stylesheet"')) {
  throw new Error('内联失败：产物里仍有外部引用，检查 vite 输出的文件名');
}

writeFileSync(out, merged, 'utf8');
rmSync(dist, { recursive: true, force: true });

const kb = (Buffer.byteLength(merged, 'utf8') / 1024).toFixed(0);
console.log(`env-tuner: games/nostos/docs/env-tuner.html  (${kb} kB, 单文件)`);
