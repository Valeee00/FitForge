import http from 'node:http';
import path from 'node:path';
import { readFile, stat, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
try { await access(path.join(root, 'index.html')); } catch { console.error('Execute npm run build antes de npm run preview.'); process.exit(1); }
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const target = path.resolve(root, `.${pathname}`);
    if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    if (!(await stat(target)).isFile()) throw new Error();
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Arquivo não encontrado.'); }
});
server.on('error', error => { console.error(error.message); process.exit(1); });
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`FitForge: http://localhost:${server.address().port} (build de produção)`));
