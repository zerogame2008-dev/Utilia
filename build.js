// Genera dist/: HTML estático por página + assets versionados por hash. Uso: node build.js
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

const { site } = await import('./src/site.js');
const { tools, categoryList, searchIndex, url, allTools } = await import('./src/registry.js');
const { articles } = await import('./src/articles.js');
const { icons } = await import('./src/icons.js');
const { setAssetBase } = await import('./src/layout.js');
const P = await import('./src/pages.js');
const { PAIRS } = await import('./public/js/tools/units-data.js');

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

// Hash de todo lo que se sirve bajo /a/<hash>/: cambiar un byte invalida la caché.
const vendor = [
  ['node_modules/pdf-lib/dist/pdf-lib.esm.min.js', 'js/vendor/pdf-lib.esm.min.js'],
  ['node_modules/pdfjs-dist/build/pdf.min.mjs', 'js/vendor/pdfjs/pdf.min.mjs'],
  ['node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'js/vendor/pdfjs/pdf.worker.min.mjs'],
  ['node_modules/pdfjs-dist/cmaps', 'js/vendor/pdfjs/cmaps'],
  ['node_modules/pdfjs-dist/standard_fonts', 'js/vendor/pdfjs/standard_fonts'],
  ['node_modules/pdfjs-dist/wasm', 'js/vendor/pdfjs/wasm'],
  ['node_modules/pdfjs-dist/iccs', 'js/vendor/pdfjs/iccs'],
];
for (const [src] of vendor) if (!existsSync(join(ROOT, src))) throw new Error(`Falta ${src}: ejecuta «npm install».`);
const h = createHash('sha256');
for (const f of [...walk(join(ROOT, 'public/css')), ...walk(join(ROOT, 'public/js'))].sort()) h.update(f).update(readFileSync(f));
h.update(JSON.stringify(icons)).update(JSON.stringify(searchIndex)).update(readFileSync(join(ROOT, 'package-lock.json')));
const HASH = h.digest('hex').slice(0, 10);
const A = `/a/${HASH}`;
setAssetBase(A);

rmSync(DIST, { recursive: true, force: true });
const write = (path, content) => { const f = join(DIST, path); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, content); };
const page = (path, htmlStr) => write(path.endsWith('/') ? path + 'index.html' : path, htmlStr.replace(/\n\s+/g, '\n').replace(/>\s{2,}</g, '> <'));

// Assets
cpSync(join(ROOT, 'public/css'), join(DIST, A, 'css'), { recursive: true });
cpSync(join(ROOT, 'public/js'), join(DIST, A, 'js'), { recursive: true });
for (const [src, dst] of vendor) cpSync(join(ROOT, src), join(DIST, A, dst), { recursive: true });
write(`${A}/icons.svg`, `<svg xmlns="http://www.w3.org/2000/svg">${Object.entries(icons).map(([k, v]) => `<symbol id="${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join('')}</svg>`);
write(`${A}/search-index.json`, JSON.stringify(searchIndex));
cpSync(join(ROOT, 'public/root'), DIST, { recursive: true });

// Páginas
const urls = []; // [path, lastmod] para el sitemap
const add = (path, html, lastmod = '2026-09-24') => { page(path, html); urls.push([path, lastmod]); };
add('/', P.home());
add('/herramientas/', P.allTools());
for (const c of categoryList) { const html = P.category(c); if (c.tools.length) add(url.category(c), html); else page(url.category(c), html); }
for (const t of tools) add(url.tool(t), P.tool(t), t.updated);
for (const pair of PAIRS) add(P.pairPath(pair), P.pairPage(pair));
add('/guias/', P.guides());
for (const a of articles) add(url.article(a), P.article(a), a.date);
for (const [path, fn] of Object.entries(P.legal)) add(path, fn());
add('/contacto/', P.contact());
page('/404.html', P.notFound());
page('/500.html', P.errorPage());

// SEO técnico
write('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([p, d]) => `<url><loc>${site.url}${p}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`);
write('/robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site.url}/sitemap.xml\n`);
write('/manifest.webmanifest', JSON.stringify({ name: site.name, short_name: site.name, description: site.description, lang: 'es', start_url: '/', display: 'standalone', background_color: '#0b0d12', theme_color: '#0b0d12', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] }));

// Redirecciones: URLs alternativas que la gente escribe → herramienta canónica (301).
const redirects = [
  ['/convertir/jpg-a-png', '/herramientas/imagenes/jpg-a-png/'], ['/convertir/png-a-jpg', '/herramientas/imagenes/png-a-jpg/'], ['/convertir/webp-a-jpg', '/herramientas/imagenes/webp-a-jpg/'], ['/convertir/webp-a-png', '/herramientas/imagenes/webp-a-png/'],
  ['/convertir/jpg-a-webp', '/herramientas/imagenes/convertir-a-webp/'], ['/convertir/png-a-webp', '/herramientas/imagenes/convertir-a-webp/'], ['/convertir/jpg-a-pdf', '/herramientas/pdf/jpg-a-pdf/'], ['/convertir/png-a-pdf', '/herramientas/pdf/png-a-pdf/'],
  ['/convertir/webp-a-pdf', '/herramientas/pdf/jpg-a-pdf/'], ['/convertir/pdf-a-jpg', '/herramientas/pdf/pdf-a-jpg/'], ['/convertir/hex-a-rgb', '/herramientas/desarrollo/conversor-colores/'], ['/convertir/rgb-a-hex', '/herramientas/desarrollo/conversor-colores/'],
  ['/conversor', '/herramientas/conversores/'], ['/convertir', '/herramientas/'],
];
write('/_redirects', redirects.map(([a, b]) => `${a} ${b} 301\n${a}/ ${b} 301`).join('\n') + '\n');
write('/redirects.json', JSON.stringify(Object.fromEntries(redirects)));

// Comprobaciones: enlaces internos rotos, imágenes sin alt, títulos duplicados. Fallan el build.
const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
const exists = (p) => { const clean = decodeURI(p.split(/[?#]/)[0]); const f = join(DIST, clean); return existsSync(f) && (statSync(f).isFile() || existsSync(join(f, 'index.html'))); };
const problems = []; const titles = new Map();
for (const f of htmlFiles) {
  const s = readFileSync(f, 'utf8'); const rel = f.slice(DIST.length).replace(/\\/g, '/');
  for (const [, href] of s.matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!href.startsWith('/api/') && !href.startsWith(A + '/icons.svg#') && !exists(href)) problems.push(`${rel}: enlace roto ${href}`);
  for (const [tag] of s.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(tag)) problems.push(`${rel}: <img> sin alt`);
  const title = s.match(/<title>([^<]*)<\/title>/)?.[1]; if (!/noindex/.test(s)) { if (titles.has(title)) problems.push(`${rel}: título duplicado con ${titles.get(title)}`); titles.set(title, rel); }
  if ((s.match(/<h1\b/g) || []).length !== 1) problems.push(`${rel}: debe tener exactamente un <h1>`);
}
for (const t of tools) if (t.missingRelated.length) problems.push(`${t.slug}: relacionadas inexistentes ${t.missingRelated.join(', ')}`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

const drafts = allTools.length - tools.length;
console.log(`✓ dist/ generado: ${htmlFiles.length} páginas, ${tools.length} herramientas publicadas${drafts ? ` (${drafts} en borrador)` : ''}, assets ${A}`);
