// Production files with controllable releases for service-worker lifecycle tests.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist');
const theme = await readFile(resolve(root, 'theme.css'), 'utf8');
const worker = await readFile(resolve(root, 'sw.js'), 'utf8');
const hash = (text) => createHash('md5').update(text).digest('hex');
let release = 'a';
let activeRelease = null;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/__pwa-test/activated') {
    activeRelease = url.searchParams.get('version');
    res.end('ok');
    return;
  }
  if (url.pathname === '/__pwa-test/state') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ activeRelease }));
    return;
  }
  if (url.pathname === '/__pwa-test/release' && req.method === 'POST') {
    const next = url.searchParams.get('version');
    if (!['a', 'b', 'broken'].includes(next)) { res.writeHead(400).end(); return; }
    release = next;
    if (next === 'a') activeRelease = null;
    res.end('ok');
    return;
  }
  let pathname = decodeURIComponent(url.pathname).replace(/^\/mychords(?=\/)/, '');
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(root, `.${pathname}`);
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  if (release === 'broken' && pathname === '/theme.css') {
    res.writeHead(503).end('Incomplete release');
    return;
  }
  try {
    let body = await readFile(file);
    const changedTheme = theme + `\n/* release ${release} */\n`;
    if (release !== 'a' && pathname === '/theme.css') body = Buffer.from(changedTheme);
    if (release !== 'a' && pathname === '/sw.js') {
      body = Buffer.from(worker.replaceAll(hash(theme), hash(changedTheme)));
    }
    if (pathname === '/sw.js') {
      // Observe activation without keeping an app client open (which blocks it).
      body = Buffer.concat([body, Buffer.from(`\nself.addEventListener('activate', event => event.waitUntil(fetch('/__pwa-test/activated?version=${release}')));`)]);
    }
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(4180, '127.0.0.1');
