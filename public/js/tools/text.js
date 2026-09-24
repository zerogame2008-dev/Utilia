import { nf, stripAccents, ToolError, need } from './_shared.js';

const seg = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('es', { granularity: 'grapheme' }) : null;
const graphemes = (s) => (seg ? [...seg.segment(s)].length : [...s].length);
const words = (s) => s.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) || [];
const lines = (s) => s.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');

export const STOP = new Set('a al algo algunas algunos ante antes como con contra cual cuando de del desde donde dos el ella ellas ellos en entre era es esa más esas ese eso esos esta estas este esto estos fue ha hay la las le les lo los mas me mi mis muy nada ni no nos o os otra otro para pero poco por porque que se sea ser si sin sobre son su sus también te tiene todo tu tus un una uno unos y ya yo the of and to in is it for on that this with as are be or'.split(' '));

export function stats(text) {
  const w = words(text);
  const ls = text ? lines(text) : [];
  const minutes = (n, wpm) => { const s = Math.round((n / wpm) * 60); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ''}`.trim(); };
  return {
    palabras: w.length,
    caracteres: graphemes(text),
    sinEspacios: graphemes(text.replace(/\s/g, '')),
    lineas: ls.length,
    lineasContenido: ls.filter((l) => l.trim()).length,
    parrafos: text.split(/\n\s*\n/).filter((p) => p.trim()).length,
    frases: (text.match(/[^.!?…]*[\p{L}\p{N}][^.!?…]*(?:[.!?…]+|$)/gu) || []).length,
    lectura: minutes(w.length, 230),
    voz: minutes(w.length, 150),
  };
}

function topWords(text, n = 10) {
  const c = new Map();
  for (const w of words(text.toLowerCase())) if (w.length > 2 && !STOP.has(w)) c.set(w, (c.get(w) || 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function statsView({ texto = '' }, focus) {
  if (!texto) return null;
  const s = stats(texto);
  const all = {
    palabras: ['Palabras', nf(s.palabras)], caracteres: ['Caracteres', nf(s.caracteres)], sinEspacios: ['Sin espacios', nf(s.sinEspacios)],
    lineas: ['Líneas', nf(s.lineas)], parrafos: ['Párrafos', nf(s.parrafos)], frases: ['Frases', nf(s.frases)], lectura: ['Lectura', s.lectura], voz: ['En voz alta', s.voz],
  };
  const order = { palabras: ['palabras', 'caracteres', 'sinEspacios', 'frases', 'parrafos', 'lineas', 'lectura', 'voz'], caracteres: ['caracteres', 'sinEspacios', 'palabras', 'lineas'], lineas: ['lineas', 'palabras', 'caracteres'] }[focus];
  const out = { stats: order.map((k) => all[k]) };
  if (focus === 'lineas') out.rows = [['Líneas con contenido', nf(s.lineasContenido)], ['Líneas vacías', nf(s.lineas - s.lineasContenido)]];
  if (focus === 'caracteres') out.rows = [['X / Twitter (280)', limit(s.caracteres, 280)], ['SMS (160)', limit(s.caracteres, 160)], ['Meta description (~155)', limit(s.caracteres, 155)], ['Título SEO (~60)', limit(s.caracteres, 60)]];
  if (focus === 'palabras') { const t = topWords(texto); if (t.length) out.table = { caption: 'Palabras más repetidas', head: ['Palabra', 'Veces'], rows: t.map(([w, c]) => [w, nf(c)]) }; }
  return out;
}
const limit = (n, max) => (n <= max ? `✓ Quedan ${nf(max - n)}` : `✗ Sobran ${nf(n - max)}`);

const cap = (w) => w.charAt(0).toLocaleUpperCase('es') + w.slice(1);
const parts = (s) => stripAccents(s).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().match(/[a-z0-9ñ]+/g) || [];

export function changeCase(t, modo) {
  switch (modo) {
    case 'upper': return t.toLocaleUpperCase('es');
    case 'lower': return t.toLocaleLowerCase('es');
    case 'title': return t.toLocaleLowerCase('es').replace(/[\p{L}\p{N}]+/gu, cap);
    case 'sentence': return t.toLocaleLowerCase('es').replace(/(^\s*|[.!?¿¡…]\s+|\n\s*)(\p{L})/gu, (m, p, l) => p + l.toLocaleUpperCase('es'));
    case 'invert': return [...t].map((c) => (c === c.toLocaleUpperCase('es') ? c.toLocaleLowerCase('es') : c.toLocaleUpperCase('es'))).join('');
    case 'camel': return t.split('\n').map((l) => parts(l).map((w, i) => (i ? cap(w) : w)).join('')).join('\n');
    case 'pascal': return t.split('\n').map((l) => parts(l).map(cap).join('')).join('\n');
    case 'snake': return t.split('\n').map((l) => parts(l).join('_')).join('\n');
    case 'kebab': return t.split('\n').map((l) => parts(l).join('-')).join('\n');
    case 'constant': return t.split('\n').map((l) => parts(l).join('_').toUpperCase()).join('\n');
    default: throw new ToolError('Formato desconocido.');
  }
}

export function clean(t, o) {
  if (o.html) t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  t = t.replace(/\r\n?/g, '\n');
  if (o.invisibles) t = t.replace(/[​-‍⁠﻿‎‏‪-‮]/g, '').replace(/[    - ]/g, ' ');
  if (o.comillas) t = t.replace(/[“”«»„]/g, '"').replace(/[‘’‚]/g, "'");
  if (o.tildes) t = t.normalize('NFD').replace(/(?![̃])[̀-ͯ]/g, '').normalize('NFC');
  if (o.saltos) t = t.split(/\n\s*\n/).map((p) => p.replace(/-\n(?=\p{Ll})/gu, '').replace(/\s*\n\s*/g, ' ')).join('\n\n');
  if (o.espacios) t = t.replace(/[ \t]{2,}/g, ' ');
  if (o.recortar) t = t.split('\n').map((l) => l.trim()).join('\n');
  if (o.vacias) t = t.split('\n').filter((l) => l.trim()).join('\n');
  return o.recortar ? t.trim() : t;
}

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
export function sortLines(t, orden, vacias) {
  let ls = lines(t); if (vacias) ls = ls.filter((l) => l.trim());
  if (orden === 'az') ls.sort(collator.compare);
  else if (orden === 'za') ls.sort((a, b) => collator.compare(b, a));
  else if (orden === 'len') ls.sort((a, b) => a.length - b.length || collator.compare(a, b));
  else if (orden === 'lendesc') ls.sort((a, b) => b.length - a.length || collator.compare(a, b));
  else if (orden === 'reverse') ls.reverse();
  else if (orden === 'random') for (let i = ls.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [ls[i], ls[j]] = [ls[j], ls[i]]; }
  return ls.join('\n');
}

export function dedupe(t, { mayus, recortar }) {
  const seen = new Set(); const out = [];
  for (const l of lines(t)) { let k = recortar ? l.trim() : l; if (mayus) k = k.toLocaleLowerCase('es'); if (!seen.has(k)) { seen.add(k); out.push(l); } }
  return { text: out.join('\n'), removed: lines(t).length - out.length };
}

const KEEP = new Set(['sin', 'no', 'ni', 'contra']); // cambian el sentido: nunca se quitan del slug
export function slugify(s, sep = '-', stop = false) {
  let w = stripAccents(s.toLowerCase()).replace(/ñ/g, 'n').replace(/&/g, ' y ').match(/[a-z0-9]+/g) || [];
  if (stop) { const f = w.filter((x) => !STOP.has(x) || KEEP.has(x)); if (f.length) w = f; }
  return w.join(sep);
}

const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer'.split(' ');
export function lorem(n, unidad, inicio, rnd = Math.random) {
  const word = () => LOREM[Math.floor(rnd() * LOREM.length)];
  const sentence = () => { const len = 6 + Math.floor(rnd() * 10); const w = Array.from({ length: len }, word); if (len > 9) w[Math.floor(len / 2)] += ','; return cap(w.join(' ')) + '.'; };
  const para = () => Array.from({ length: 3 + Math.floor(rnd() * 4) }, sentence).join(' ');
  const start = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';
  if (unidad === 'w') { const w = Array.from({ length: n }, word); if (inicio) start.toLowerCase().replace(',', '').split(' ').slice(0, n).forEach((x, i) => (w[i] = x)); return cap(w.join(' ')); }
  const items = Array.from({ length: n }, unidad === 'p' ? para : sentence);
  if (inicio) items[0] = start + (unidad === 'p' ? '. ' + items[0] : '.');
  return items;
}

// Diff por líneas con LCS. Techo: O(n·m) en memoria, de ahí el límite de 5000 líneas.
export function diffLines(a, b, trim) {
  const A = lines(a), B = lines(b); const key = (s) => (trim ? s.trim() : s);
  need(A.length * B.length <= 25e6, 'Los textos son demasiado largos para compararlos aquí (máximo ~5.000 líneas cada uno).');
  const n = A.length, m = B.length; const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = key(A[i]) === key(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) { if (key(A[i]) === key(B[j])) { out.push([' ', B[j]]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push(['-', A[i++]]); else out.push(['+', B[j++]]); }
  while (i < n) out.push(['-', A[i++]]); while (j < m) out.push(['+', B[j++]]);
  return out;
}

export default {
  'contador-palabras': (v) => statsView(v, 'palabras'),
  'contador-caracteres': (v) => statsView(v, 'caracteres'),
  'contador-lineas': (v) => statsView(v, 'lineas'),
  'mayusculas-minusculas': ({ texto, modo }) => (texto ? { text: changeCase(texto, modo), filename: 'texto.txt' } : null),
  'limpiar-texto': (v) => { if (!v.texto) return null; const t = clean(v.texto, v); return { text: t, filename: 'texto-limpio.txt', notes: [`${nf(v.texto.length - t.length)} caracteres eliminados.`] }; },
  'ordenar-lineas': ({ texto, orden, vacias }) => (texto ? { text: sortLines(texto, orden, vacias), filename: 'lista-ordenada.txt' } : null),
  'eliminar-lineas-duplicadas': (v) => { if (!v.texto) return null; const r = dedupe(v.texto, v); return { text: r.text, filename: 'lista-sin-duplicados.txt', notes: [`${nf(r.removed)} línea${r.removed === 1 ? '' : 's'} duplicada${r.removed === 1 ? '' : 's'} eliminada${r.removed === 1 ? '' : 's'}.`] }; },
  'buscar-reemplazar': ({ texto, buscar, reemplazar = '', mayus, regex }) => {
    if (!texto || !buscar) return null;
    let re;
    try { re = new RegExp(regex ? buscar : buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), mayus ? 'g' : 'gi'); } catch { throw new ToolError('La expresión regular no es válida.'); }
    let count = 0; const text = texto.replace(re, (...m) => { count++; return regex ? reemplazar.replace(/\$(\d)/g, (_, d) => m[d] ?? '') : reemplazar; });
    return { text, filename: 'texto.txt', notes: [`${nf(count)} reemplazo${count === 1 ? '' : 's'}.`] };
  },
  'lorem-ipsum': ({ cantidad, unidad, inicio, html }) => {
    const n = Math.min(Math.max(Math.round(cantidad || 1), 1), 100);
    const r = lorem(n, unidad, inicio);
    const text = Array.isArray(r) ? (html ? r.map((p) => `<p>${p}</p>`).join('\n') : r.join(unidad === 'p' ? '\n\n' : ' ')) : r;
    return { text, filename: 'lorem-ipsum.txt' };
  },
  'comparar-textos': ({ a = '', b = '', espacios }) => {
    need(a || b, 'Pega los dos textos que quieres comparar.');
    const d = diffLines(a, b, espacios);
    const add = d.filter((x) => x[0] === '+').length, del = d.filter((x) => x[0] === '-').length;
    return { stats: [['Añadidas', nf(add)], ['Eliminadas', nf(del)], ['Sin cambios', nf(d.length - add - del)]], diff: add + del ? d : null, notes: add + del ? [] : ['Los dos textos son idénticos.'] };
  },
  'generador-slug': ({ texto, separador, stop }) => (texto ? { text: lines(texto).map((l) => slugify(l, separador, stop)).join('\n') } : null),
};
