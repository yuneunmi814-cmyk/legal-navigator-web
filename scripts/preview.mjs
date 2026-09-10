import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { onRequest } from '../functions/api/[[path]].js';
const root = resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:4173');
    if (url.pathname.startsWith('/api/')) {
      const request = new Request(url, { method: req.method, headers: req.headers, ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: req, duplex: 'half' } : {}) });
      const answer = await onRequest({ request }); res.writeHead(answer.status, Object.fromEntries(answer.headers)); res.end(Buffer.from(await answer.arrayBuffer())); return;
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let file = resolve(root, relative || 'index.html');
    if (!file.startsWith(root + sep) || /(^|\/)(\.|functions|scripts)/.test(relative)) { res.writeHead(404); res.end(); return; }
    try { if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html'); }
    catch { if (!extname(file)) file += '.html'; }
    const contents = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(contents);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Preview http://localhost:4173'));
