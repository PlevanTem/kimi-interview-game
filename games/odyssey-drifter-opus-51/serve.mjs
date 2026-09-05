/**
 * serve.mjs — 零依赖静态服务器（开发用）。
 * 关闭缓存，避免改了源码却跑到旧文件上。
 *
 *   node games/odyssey-drifter-opus-51/serve.mjs [port]
 *
 * 另外提供一个仅本机可用的取证端点：
 *   POST /_shot?name=xxx   body = canvas.toDataURL() 字符串
 *   -> 写入 runs/run-20260903-opus51-mechanic-r1/evidence/xxx.png
 * 它只在开发时用于把自动驾驶跑出来的画面存成证据，不属于游戏运行时。
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const EVIDENCE = join(ROOT, 'runs', 'run-20260903-opus51-mechanic-r1', 'evidence');
const PORT = Number(process.argv[2] || 5183);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function safePath(pathname) {
  const parts = pathname.split('/').filter((seg) => seg && seg !== '.' && seg !== '..');
  return join(ROOT, parts.join('/'));
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'POST' && url.pathname === '/_shot') {
    const name = (url.searchParams.get('name') || 'shot').replace(/[^a-z0-9_-]/gi, '');
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks).toString('utf8');
    const b64 = body.slice(body.indexOf(',') + 1);
    await mkdir(EVIDENCE, { recursive: true });
    const file = join(EVIDENCE, name + '.png');
    await writeFile(file, Buffer.from(b64, 'base64'));
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(file);
    return;
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const path = safePath(rel);
  if (!path.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  try {
    const s = await stat(path);
    if (s.isDirectory()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[extname(path)] || 'application/octet-stream',
      'Cache-Control': 'no-store, max-age=0',
    });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log('光线之上 dev server: http://localhost:' + PORT);
});
