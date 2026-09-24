import { need, nf, ToolError } from './_shared.js';
import { STOP } from './text.js';

let g;
const width = (s, font) => { if (typeof document === 'undefined') return s.length * (font.startsWith('20') ? 9.5 : 6.8); g ||= document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(s).width; };
// Recorta por píxeles como Google (aprox.): título 20px Arial ≤ 580px, descripción 14px Arial ≤ 920px.
export function cut(s, max, font) {
  if (width(s, font) <= max) return [s, false];
  let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (width(s.slice(0, m) + ' …', font) <= max) lo = m; else hi = m - 1; }
  return [s.slice(0, lo).replace(/\s+\S*$/, '') + ' …', true];
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const AI_BOTS = ['GPTBot', 'ChatGPT-User', 'CCBot', 'Google-Extended', 'anthropic-ai', 'ClaudeBot', 'PerplexityBot', 'Bytespider', 'Applebot-Extended', 'meta-externalagent'];

export function robots({ modo, sitemap, bloquear, ia }) {
  const out = ['User-agent: *'];
  if (modo === 'bloquear') out.push('Disallow: /');
  else { const paths = String(bloquear || '').split('\n').map((l) => l.trim()).filter(Boolean); if (paths.length) paths.forEach((p) => out.push(`Disallow: ${p.startsWith('/') || p.startsWith('*') ? p : '/' + p}`)); else out.push('Allow: /'); }
  if (ia) AI_BOTS.forEach((b) => out.push('', `User-agent: ${b}`, 'Disallow: /'));
  if (sitemap?.trim()) { need(/^https?:\/\//.test(sitemap.trim()), 'La URL del sitemap debe ser absoluta (https://…).'); out.push('', `Sitemap: ${sitemap.trim()}`); }
  return out.join('\n') + '\n';
}

export function sitemap(urls, fecha) {
  const seen = new Set(), bad = [], ok = [];
  for (const u of String(urls || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    let url; try { url = new URL(u); } catch { bad.push(u); continue; }
    if (!/^https?:$/.test(url.protocol)) { bad.push(u); continue; }
    if (!seen.has(url.href)) { seen.add(url.href); ok.push(url.href); }
  }
  const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ok.map((u) => `  <url>\n    <loc>${xmlEsc(u)}</loc>${fecha ? `\n    <lastmod>${fecha}</lastmod>` : ''}\n  </url>`).join('\n')}\n</urlset>\n`;
  return { xml, ok, bad };
}

export function density(text, n, stop) {
  const w = (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []); const c = new Map(); let total = 0;
  for (let i = 0; i + n <= w.length; i++) {
    const gram = w.slice(i, i + n); if (stop && (STOP.has(gram[0]) || STOP.has(gram[n - 1]) || (n === 1 && gram[0].length < 3))) continue;
    const k = gram.join(' '); c.set(k, (c.get(k) || 0) + 1); total++;
  }
  return { words: w.length, rows: [...c].filter(([, v]) => n === 1 || v > 1).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => [k, v, (v / Math.max(1, w.length - n + 1)) * 100]), total };
}

export function headings(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const hs = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => [Number(h.tagName[1]), h.textContent.replace(/\s+/g, ' ').trim()]);
  const warn = []; const h1 = hs.filter(([l]) => l === 1).length;
  if (!h1) warn.push('No hay ningún H1: cada página debería tener uno que describa su contenido.');
  if (h1 > 1) warn.push(`Hay ${h1} H1. Lo recomendable es uno solo.`);
  hs.forEach(([l, t], i) => { if (!t) warn.push(`El H${l} nº ${i + 1} está vacío.`); if (i && l > hs[i - 1][0] + 1) warn.push(`Salto de nivel: de H${hs[i - 1][0]} a H${l} en «${t.slice(0, 50)}».`); });
  return { hs, warn };
}

export default {
  'vista-previa-serp': ({ titulo = '', url = '', descripcion = '' }) => {
    if (!titulo && !descripcion) return null;
    const [t, tc] = cut(titulo || 'Título de la página', 580, '20px Arial'); const [d, dc] = cut(descripcion || 'Añade una meta description para controlar este texto.', 920, '14px Arial');
    let crumb = url; try { const u = new URL(url); crumb = u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? ' › ' + u.pathname.split('/').filter(Boolean).join(' › ') : ''); } catch { /* URL parcial */ }
    const tw = width(titulo, '20px Arial');
    return { serp: { title: t, url: crumb || 'ejemplo.com', desc: d }, rows: [['Título', `${titulo.length} caracteres · ${nf(tw, 0)} / 580 px ${tc ? '— se cortará' : '✓'}`], ['Descripción', `${descripcion.length} caracteres ${dc ? '— se cortará' : descripcion.length < 70 && descripcion ? '— muy corta' : descripcion ? '✓' : ''}`]] };
  },
  'generador-meta-tags': ({ titulo, descripcion, url, imagen, sitio, tipo, twitter, idioma }) => {
    if (!titulo) return null;
    const L = [`<title>${esc(titulo)}</title>`];
    if (descripcion) L.push(`<meta name="description" content="${esc(descripcion)}">`);
    if (url) L.push(`<link rel="canonical" href="${esc(url)}">`);
    L.push('', `<meta property="og:type" content="${esc(tipo)}">`, `<meta property="og:title" content="${esc(titulo)}">`);
    if (descripcion) L.push(`<meta property="og:description" content="${esc(descripcion)}">`);
    if (url) L.push(`<meta property="og:url" content="${esc(url)}">`);
    if (imagen) L.push(`<meta property="og:image" content="${esc(imagen)}">`);
    if (sitio) L.push(`<meta property="og:site_name" content="${esc(sitio)}">`);
    if (idioma) L.push(`<meta property="og:locale" content="${esc(idioma)}">`);
    L.push('', `<meta name="twitter:card" content="${imagen ? 'summary_large_image' : 'summary'}">`);
    if (twitter) L.push(`<meta name="twitter:site" content="${esc(twitter.startsWith('@') ? twitter : '@' + twitter)}">`);
    const notes = []; if (titulo.length > 60) notes.push('El título supera 60 caracteres: puede cortarse en Google.'); if (descripcion && descripcion.length > 160) notes.push('La descripción supera 160 caracteres.'); if (!imagen) notes.push('Sin imagen, las redes sociales mostrarán una tarjeta pequeña.');
    if (url && !/^https?:\/\//.test(url)) notes.push('La URL canónica debe ser absoluta (https://…).');
    return { text: L.join('\n'), filename: 'meta-tags.html', notes };
  },
  'generador-robots-txt': (v) => ({ text: robots(v), filename: 'robots.txt' }),
  'generador-sitemap': ({ urls, fecha }) => {
    if (!urls?.trim()) return null;
    const r = sitemap(urls, fecha); need(r.ok.length, 'No hay ninguna URL válida. Deben empezar por http:// o https://.');
    return { stats: [['URLs', nf(r.ok.length, 0)]], text: r.xml, filename: 'sitemap.xml', notes: r.bad.length ? [`Se han omitido ${r.bad.length} líneas no válidas: ${r.bad.slice(0, 3).join(', ')}${r.bad.length > 3 ? '…' : ''}`] : [] };
  },
  'densidad-palabras-clave': ({ texto, n, stop }) => {
    if (!texto?.trim()) return null;
    const r = density(texto, Number(n), stop);
    return { stats: [['Palabras', nf(r.words, 0)]], table: r.rows.length ? { head: [Number(n) === 1 ? 'Palabra' : 'Frase', 'Veces', 'Densidad'], rows: r.rows.map(([k, v, p]) => [k, v, `${nf(p, 2)} %`]) } : undefined, notes: r.rows.length ? [] : ['No hay frases repetidas.'] };
  },
  'analizador-encabezados': ({ html }) => {
    need(html?.trim(), 'Pega el código HTML de la página.');
    const { hs, warn } = headings(html);
    if (!hs.length) throw new ToolError('No se ha encontrado ningún encabezado (h1–h6) en el código.');
    return { stats: [['Encabezados', hs.length], ['H1', hs.filter(([l]) => l === 1).length], ['Avisos', warn.length]], notes: warn.length ? warn : ['✓ La jerarquía de encabezados es correcta.'], text: hs.map(([l, t]) => `${'  '.repeat(l - 1)}H${l}  ${t || '(vacío)'}`).join('\n'), textLabel: 'Estructura' };
  },
};
