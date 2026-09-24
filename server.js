// Servidor de producción/desarrollo sin dependencias: sirve dist/ y enruta /api/* a los handlers compartidos.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname, normalize, dirname, sep } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import './src/env.js';
import { handle } from './api/router.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8141);
const PROD = process.env.NODE_ENV === 'production';
const DIST = join(ROOT, 'dist');
process.env.DATA_DIR ||= join(ROOT, 'data');
if (!existsSync(DIST)) { console.error('Falta dist/: ejecuta «npm run build».'); process.exit(1); }
const redirects = existsSync(join(DIST, 'redirects.json')) ? JSON.parse(readFileSync(join(DIST, 'redirects.json'), 'utf8')) : {};

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm', '.bcmap': 'application/octet-stream', '.pfb': 'application/octet-stream', '.ttf': 'font/ttf', '.icc': 'application/vnd.iccprofile' };
const COMPRESS = /^(text\/|application\/(json|javascript|xml|manifest|wasm)|image\/svg)/;
const SECURITY = {
  'content-security-policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests",
  'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()', 'cross-origin-opener-policy': 'same-origin',
  ...(PROD ? { 'strict-transport-security': 'max-age=31536000; includeSubDomains' } : {}),
};
const cache = new Map(); // ponytail: caché en memoria de ficheros comprimidos; dist/ es inmutable entre despliegues

async function file(path) {
  if (cache.has(path)) return cache.get(path);
  const s = await stat(path).catch(() => null); if (!s?.isFile()) return null;
  const body = await readFile(path); const type = TYPES[extname(path)] || 'application/octet-stream';
  const entry = { body, type, gz: COMPRESS.test(type) && body.length > 1024 ? gzipSync(body) : null, br: COMPRESS.test(type) && body.length > 1024 ? brotliCompressSync(body) : null };
  if (PROD && body.length < 5e6) cache.set(path, entry);
  return entry;
}

async function send(req, res, status, f, extra = {}) {
  const ae = req.headers['accept-encoding'] || ''; let body = f.body, enc;
  if (f.br && /\bbr\b/.test(ae)) { body = f.br; enc = 'br'; } else if (f.gz && /\bgzip\b/.test(ae)) { body = f.gz; enc = 'gzip'; }
  res.writeHead(status, { ...SECURITY, 'content-type': f.type, 'content-length': body.length, vary: 'accept-encoding', ...(enc ? { 'content-encoding': enc } : {}), ...extra });
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (PROD && req.headers['x-forwarded-proto'] === 'http') { res.writeHead(301, { location: `https://${req.headers.host}${req.url}` }); return res.end(); }
    if (url.pathname.startsWith('/api/')) {
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
      const request = new Request(new URL(req.url, `http://${req.headers.host}`), { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req, duplex: 'half' });
      const r = await handle(request, { ip });
      res.writeHead(r.status, { ...SECURITY, ...Object.fromEntries(r.headers) });
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, SECURITY); return res.end(); }
    const clean = url.pathname.replace(/\/+$/, '') || '/';
    if (redirects[clean]) { res.writeHead(301, { location: redirects[clean] }); return res.end(); }
    let path; try { path = normalize(join(DIST, decodeURIComponent(url.pathname))); } catch { path = null; }
    if (!path || (path !== DIST && !path.startsWith(DIST + sep))) { res.writeHead(400, SECURITY); return res.end(); }
    let f = await file(path);
    if (!f && !extname(path)) {
      if (!url.pathname.endsWith('/') && (await file(join(path, 'index.html')))) { res.writeHead(301, { location: url.pathname + '/' + url.search }); return res.end(); }
      f = await file(join(path, 'index.html'));
    }
    if (!f) return send(req, res, 404, await file(join(DIST, '404.html')), { 'cache-control': 'no-store' });
    const immutable = url.pathname.startsWith('/a/');
    return send(req, res, 200, f, { 'cache-control': immutable ? 'public, max-age=31536000, immutable' : f.type.startsWith('text/html') ? 'public, max-age=0, must-revalidate' : 'public, max-age=86400' });
  } catch (e) {
    console.error(`[error] ${req.method} ${req.url?.slice(0, 200)}: ${e.message}`);
    const f = await file(join(DIST, '500.html')).catch(() => null);
    if (f && !res.headersSent) return send(req, res, 500, f, { 'cache-control': 'no-store' });
    res.end();
  }
});
server.listen(PORT, () => console.log(`Utilia en http://localhost:${PORT}`));
