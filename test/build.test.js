import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tools } from '../src/registry.js';

const dist = (p) => new URL(`../dist${p}`, import.meta.url);

test('cada herramienta publicada tiene su función en la familia declarada', async () => {
  for (const t of tools) {
    const mod = (await import(`../public/js/tools/${t.family}.js`)).default;
    assert.equal(typeof mod[t.slug], 'function', `${t.family}.js no exporta «${t.slug}»`);
  }
});

test('el build genera páginas, SEO técnico y pasa sus comprobaciones', () => {
  execFileSync(process.execPath, [fileURLToPath(new URL('../build.js', import.meta.url))], { stdio: 'pipe' });
  for (const p of ['/index.html', '/404.html', '/sitemap.xml', '/robots.txt', '/manifest.webmanifest', '/favicon.ico', '/og.png', '/_redirects', '/aviso-legal/index.html', '/privacidad/index.html', '/cookies/index.html', '/contacto/index.html']) assert.ok(existsSync(dist(p)), `falta ${p}`);
  const sitemap = readFileSync(dist('/sitemap.xml'), 'utf8');
  for (const t of tools) assert.ok(sitemap.includes(`/herramientas/${t.category}/${t.slug}/</loc>`), `${t.slug} no está en el sitemap`);
  assert.ok(!sitemap.includes('/herramientas/ia/<'), 'categoría vacía no debe indexarse');
  const page = readFileSync(dist('/herramientas/pdf/comprimir-pdf/index.html'), 'utf8');
  for (const needle of ['<link rel="canonical" href="', 'og:title', 'twitter:card', '"@type":"BreadcrumbList"', '"@type":"SoftwareApplication"', '"@type":"FAQPage"', '<h1>Comprimir PDF</h1>']) assert.ok(page.includes(needle), `falta ${needle}`);
  assert.ok(readFileSync(dist('/404.html'), 'utf8').includes('noindex'));
});
