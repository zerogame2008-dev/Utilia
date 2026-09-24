import { ToolError, need, nf, bytes } from './_shared.js';

// ---------- Base64 UTF-8 ----------
export function b64encode(s, urlSafe) {
  const bin = Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join('');
  const out = btoa(bin);
  return urlSafe ? out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : out;
}
export function b64bytes(s) {
  let t = s.trim().replace(/^data:[^,]*;base64,/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  need(/^[A-Za-z0-9+/]*={0,2}$/.test(t), 'La cadena contiene caracteres que no son Base64.');
  t += '='.repeat((4 - (t.length % 4)) % 4);
  try { return Uint8Array.from(atob(t), (c) => c.charCodeAt(0)); } catch { throw new ToolError('La cadena Base64 está incompleta o dañada.'); }
}
export const b64decode = (s) => new TextDecoder('utf-8', { fatal: true }).decode(b64bytes(s));

// ---------- JSON ----------
export function jsonError(text, err) {
  const m = String(err.message).match(/position (\d+)/) || null;
  const lc = String(err.message).match(/line (\d+) column (\d+)/);
  let line, col;
  if (lc) { line = +lc[1]; col = +lc[2]; } else if (m) { const before = text.slice(0, +m[1]).split('\n'); line = before.length; col = before.at(-1).length + 1; }
  const hints = [];
  if (/'[^']*'\s*:/.test(text) || /:\s*'/.test(text)) hints.push('JSON exige comillas dobles ("), no simples.');
  if (/,\s*[}\]]/.test(text)) hints.push('Hay una coma antes de } o ]: quítala.');
  if (/\/\/|\/\*/.test(text)) hints.push('JSON no admite comentarios.');
  if (/[{,]\s*[A-Za-z_$][\w$]*\s*:/.test(text)) hints.push('Las claves deben ir entre comillas dobles.');
  if (!text.trim()) return { message: 'El JSON está vacío.', hints };
  let excerpt = '';
  if (line) { const l = text.split('\n')[line - 1] ?? ''; const start = Math.max(0, col - 40); excerpt = `${l.slice(start, col + 40)}\n${' '.repeat(col - 1 - start)}^`; }
  return { message: line ? `JSON no válido en la línea ${line}, columna ${col}.` : 'JSON no válido.', excerpt, hints, line, col };
}
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
export function formatJson(text, sangria, ordenar) {
  let v; try { v = JSON.parse(text); } catch (e) { const j = jsonError(text, e); throw new ToolError([j.message, ...j.hints].join(' ')); }
  if (ordenar) v = sortKeys(v);
  return sangria === 'min' ? JSON.stringify(v) : JSON.stringify(v, null, sangria === 'tab' ? '\t' : Number(sangria));
}

// ---------- MD5 (SubtleCrypto no lo incluye) ----------
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
export function md5(input) {
  const b = typeof input === 'string' ? new TextEncoder().encode(input) : input; const len = b.length;
  const n = ((len + 8) >>> 6) + 1; const w = new Uint32Array(n * 16);
  for (let i = 0; i < len; i++) w[i >> 2] |= b[i] << ((i % 4) * 8);
  w[len >> 2] |= 0x80 << ((len % 4) * 8); w[n * 16 - 2] = (len * 8) >>> 0; w[n * 16 - 1] = Math.floor(len / 0x20000000);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let k = 0; k < n; k++) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + w[k * 16 + g]) >>> 0; A = D; D = C; C = B;
      const s = S[(i >> 4) * 4 + (i % 4)]; B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  return [a0, b0, c0, d0].map((x) => [0, 8, 16, 24].map((s) => ((x >>> s) & 255).toString(16).padStart(2, '0')).join('')).join('');
}
const hex = (buf) => Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, '0')).join('');

// ---------- UUID ----------
export function uuid(version) {
  if (version === '4') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); let t = Date.now();
  for (let i = 5; i >= 0; i--) { b[i] = t % 256; t = Math.floor(t / 256); }
  b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
  const h = hex(b); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---------- Contraseñas: muestreo por rechazo para distribución uniforme ----------
export function password(len, chars) {
  const out = []; const max = 256 - (256 % chars.length);
  while (out.length < len) for (const x of crypto.getRandomValues(new Uint8Array(len * 2))) { if (x < max && out.length < len) out.push(chars[x % chars.length]); }
  return out.join('');
}

// ---------- Colores ----------
export function parseColor(s) {
  s = String(s).trim().toLowerCase();
  let m;
  if ((m = s.match(/^#?([0-9a-f]{3,8})$/)) && [3, 4, 6, 8].includes(m[1].length)) {
    let h = m[1]; if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  const nums = (x) => x.split(/[\s,/]+/).filter(Boolean);
  if ((m = s.match(/^rgba?\((.+)\)$/)) || (m = s.match(/^(\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3})$/))) {
    const p = nums(m[1]); need(p.length >= 3, 'Formato RGB incompleto.');
    const ch = (v) => Math.round(v.endsWith('%') ? parseFloat(v) * 2.55 : parseFloat(v));
    const [r, g, b] = p.slice(0, 3).map(ch); const a = p[3] ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
    need([r, g, b].every((v) => v >= 0 && v <= 255), 'Los valores RGB deben estar entre 0 y 255.');
    return { r, g, b, a };
  }
  if ((m = s.match(/^hsla?\((.+)\)$/))) {
    const p = nums(m[1]); const h = parseFloat(p[0]), sat = parseFloat(p[1]) / 100, l = parseFloat(p[2]) / 100;
    need([h, sat, l].every(Number.isFinite), 'Formato HSL no válido.');
    const k = (n) => (n + h / 30) % 12; const a2 = sat * Math.min(l, 1 - l); const f = (n) => l - a2 * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255), a: p[3] ? parseFloat(p[3]) : 1 };
  }
  if (typeof document !== 'undefined' && /^[a-z]+$/.test(s)) { // nombres CSS: el navegador los resuelve
    const ctx = document.createElement('canvas').getContext('2d'); ctx.fillStyle = '#010203'; ctx.fillStyle = s;
    if (ctx.fillStyle !== '#010203') return parseColor(ctx.fillStyle);
  }
  throw new ToolError('No reconozco el color. Prueba con #4f46e5, rgb(79, 70, 229) o hsl(243 75% 59%).');
}
export const toHex = ({ r, g, b }) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
export function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2; let h = 0, s = 0;
  if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
const lum = ({ r, g, b }) => { const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---------- CSS ----------
function scanCss(css, emit) { // recorre respetando comentarios y cadenas
  let i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); const end = e < 0 ? css.length : e + 2; if (css[i + 2] === '!') emit('comment', css.slice(i, end)); i = end; continue; }
    if (c === 'u' && /^url\(\s*[^'"\s]/i.test(css.slice(i, i + 6))) { const e = css.indexOf(')', i); const end = e < 0 ? css.length : e + 1; emit('str', css.slice(i, end)); i = end; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < css.length && css[j] !== c) { if (css[j] === '\\') j++; j++; } emit('str', css.slice(i, j + 1)); i = j + 1; continue; }
    if (/\s/.test(c)) { while (i < css.length && /\s/.test(css[i])) i++; emit('ws', ' '); continue; }
    emit('ch', c); i++;
  }
}
export function minifyCss(css) {
  let out = ''; let pendingWs = false; let depth = 0;
  scanCss(css, (type, v) => {
    if (type === 'ws') { pendingWs = true; return; }
    if (type === 'ch') depth += v === '{' ? 1 : v === '}' ? -1 : 0;
    if (pendingWs && out && !'{};:,>('.includes(out.at(-1)) && !(type === 'ch' && ('{};,>)!'.includes(v) || (v === ':' && depth > 0)))) out += ' ';
    pendingWs = false;
    if (v === '}' && out.at(-1) === ';') out = out.slice(0, -1);
    out += v;
  });
  return out;
}
export function formatCss(css) {
  let out = '', depth = 0; const ind = () => '  '.repeat(depth);
  scanCss(minifyCss(css), (type, v) => {
    if (type !== 'ch') { out += v; return; }
    if (v === '{') { depth++; out = out.trimEnd() + ' {\n' + ind(); }
    else if (v === '}') { depth = Math.max(0, depth - 1); out = out.trimEnd(); if (!/[{;}]$/.test(out)) out += ';'; out += '\n' + ind() + '}\n' + (depth ? ind() : '\n'); }
    else if (v === ';') out += ';\n' + ind();
    else out += v;
  });
  // Declaraciones (acaban en ;): «a:b» → «a: b». Todas las líneas: «,» → «, ».
  return out.split('\n').map((l) => (/;$/.test(l) ? l.replace(/^(\s*[\w-]+):(?! )/, '$1: ') : l).replace(/,(?! )/g, (m, i, s) => (/url\(|["']/.test(s) ? m : ', '))).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ---------- Timestamp ----------
export function parseInstant(v) {
  const s = String(v ?? '').trim(); if (!s) return null;
  if (s === 'now') return new Date();
  if (/^-?\d+(\.\d+)?$/.test(s)) { const n = Number(s); return new Date(Math.abs(n) >= 1e11 ? n : n * 1000); }
  const t = Date.parse(s.replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, '$1T$2'));
  need(Number.isFinite(t), 'No reconozco la fecha. Usa un timestamp (1767225600) o una fecha como 2026-01-01 12:00.');
  return new Date(t);
}

const rel = (ms) => { const a = Math.abs(ms), f = ms < 0 ? 'hace' : 'dentro de'; const u = [[31557600e3, 'año'], [2629746e3, 'mes'], [86400e3, 'día'], [3600e3, 'hora'], [60e3, 'minuto']].find(([x]) => a >= x); return u ? `${f} ${Math.floor(a / u[0])} ${u[1]}${Math.floor(a / u[0]) > 1 ? (u[1] === 'mes' ? 'es' : 's') : ''}` : 'ahora mismo'; };

export default {
  'formateador-json': ({ texto, sangria, ordenar }) => {
    if (!texto?.trim()) return null;
    const text = formatJson(texto, sangria, ordenar);
    return { text, filename: 'datos.json', notes: [`${bytes(new Blob([texto]).size)} → ${bytes(new Blob([text]).size)}`] };
  },
  'validador-json': ({ texto }) => {
    if (!texto?.trim()) return null;
    try { const v = JSON.parse(texto); const kind = Array.isArray(v) ? `array con ${v.length} elementos` : v === null ? 'null' : typeof v === 'object' ? `objeto con ${Object.keys(v).length} claves` : typeof v;
      return { stats: [['Resultado', '✓ JSON válido']], rows: [['Raíz', kind], ['Tamaño', bytes(new Blob([texto]).size)]] };
    } catch (e) { const j = jsonError(texto, e); return { stats: [['Resultado', '✗ JSON no válido']], rows: [['Error', j.message], ...j.hints.map((h) => ['Pista', h])], text: j.excerpt || undefined, textLabel: 'Fragmento' }; }
  },
  'base64-codificar': ({ texto, url }) => (texto ? { text: b64encode(texto, url), filename: 'base64.txt' } : null),
  'base64-decodificar': ({ texto }) => {
    if (!texto?.trim()) return null;
    const img = texto.trim().match(/^data:(image\/(png|jpeg|gif|webp|svg\+xml));base64,/);
    if (img) { const b = b64bytes(texto); return { files: [{ name: `imagen.${img[2] === 'svg+xml' ? 'svg' : img[2] === 'jpeg' ? 'jpg' : img[2]}`, blob: new Blob([b], { type: img[1] }) }] }; }
    try { return { text: b64decode(texto), filename: 'decodificado.txt' }; } catch (e) {
      if (e instanceof ToolError) throw e;
      const b = b64bytes(texto); return { notes: ['El contenido es binario, no texto. Puedes descargarlo como archivo.'], files: [{ name: 'decodificado.bin', blob: new Blob([b]) }] };
    }
  },
  'url-codificar': ({ texto, modo }) => (texto ? { text: modo === 'full' ? encodeURI(texto) : encodeURIComponent(texto) } : null),
  'url-decodificar': ({ texto }) => {
    if (!texto?.trim()) return null;
    let text; try { text = decodeURIComponent(texto.replace(/\+/g, texto.includes('?') ? ' ' : '+')); } catch { throw new ToolError('La URL contiene una secuencia % no válida (por ejemplo, %E9 suelto de otra codificación).'); }
    const out = { text };
    try { const u = new URL(texto.trim()); out.rows = [['Protocolo', u.protocol], ['Dominio', u.hostname], ...(u.port ? [['Puerto', u.port]] : []), ['Ruta', decodeURIComponent(u.pathname)], ...(u.hash ? [['Fragmento', decodeURIComponent(u.hash)]] : [])];
      const q = [...u.searchParams]; if (q.length) out.table = { caption: 'Parámetros', head: ['Clave', 'Valor'], rows: q };
    } catch { /* no es una URL completa: basta con el texto */ }
    return out;
  },
  'generador-uuid': ({ cantidad, version, mayus, guiones }) => {
    const n = Math.min(Math.max(Math.round(cantidad || 1), 1), 1000);
    let ids = Array.from({ length: n }, () => uuid(version)); if (!guiones) ids = ids.map((x) => x.replace(/-/g, '')); if (mayus) ids = ids.map((x) => x.toUpperCase());
    return { text: ids.join('\n'), filename: 'uuids.txt' };
  },
  'generador-hash': async ({ texto }) => {
    if (!texto) return null;
    const data = new TextEncoder().encode(texto);
    const rows = [['MD5', md5(data)]];
    for (const a of ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']) rows.push([a, hex(await crypto.subtle.digest(a, data))]);
    return { rows, copyRows: true };
  },
  'generador-contrasenas': ({ longitud, mayus, minus, numeros, simbolos, ambiguos, cantidad }) => {
    let chars = (mayus ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '') + (minus ? 'abcdefghijklmnopqrstuvwxyz' : '') + (numeros ? '0123456789' : '') + (simbolos ? '!@#$%^&*()-_=+[]{};:,.?/' : '');
    if (ambiguos) chars = chars.replace(/[0O1lI|]/g, '');
    need(chars.length, 'Selecciona al menos un tipo de carácter.');
    const len = Math.min(Math.max(Math.round(longitud || 16), 4), 128); const n = Math.min(Math.max(Math.round(cantidad || 1), 1), 50);
    const bits = len * Math.log2(chars.length);
    return { stats: [['Entropía', `${nf(bits, 0)} bits`], ['Fortaleza', bits >= 100 ? 'Excelente' : bits >= 75 ? 'Fuerte' : bits >= 50 ? 'Aceptable' : 'Débil']], text: Array.from({ length: n }, () => password(len, chars)).join('\n') };
  },
  'probador-regex': ({ patron, flags = '', texto = '' }) => {
    if (!patron) return null;
    need(/^[dgimsuyv]*$/.test(flags) && new Set(flags).size === flags.length, 'Flags no válidos. Usa una combinación de g, i, m, s, u, y, d.');
    let re; try { re = new RegExp(patron, flags.includes('g') ? flags : flags + 'g'); } catch (e) { throw new ToolError(`Expresión no válida: ${e.message.replace(/^Invalid regular expression: /, '')}`); }
    const all = []; const t0 = Date.now();
    for (const m of texto.matchAll(re)) { all.push(m); if (!flags.includes('g') || all.length >= 1000 || Date.now() - t0 > 500) break; if (m[0] === '') re.lastIndex++; }
    const groups = Math.max(0, ...all.map((m) => m.length - 1));
    return {
      stats: [['Coincidencias', nf(all.length) + (all.length >= 1000 ? '+' : '')]],
      marks: texto ? { text: texto, ranges: all.filter((m) => m[0]).map((m) => [m.index, m.index + m[0].length]) } : undefined,
      table: all.length ? { caption: 'Coincidencias', head: ['#', 'Posición', 'Texto', ...Array.from({ length: groups }, (_, i) => `Grupo ${i + 1}`)], rows: all.slice(0, 200).map((m, i) => [i + 1, m.index, m[0], ...Array.from({ length: groups }, (_, g) => m[g + 1] ?? '—')]) } : undefined,
    };
  },
  'conversor-timestamp': ({ valor }) => {
    const d = parseInstant(valor); if (!d) return null;
    need(Number.isFinite(d.getTime()), 'Fecha fuera de rango.');
    return { stats: [['Unix (segundos)', String(Math.floor(d.getTime() / 1000))], ['Milisegundos', String(d.getTime())]], rows: [['Fecha local', d.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'long' })], ['UTC', d.toUTCString()], ['ISO 8601', d.toISOString()], ['Relativo', rel(d.getTime() - Date.now())]], copyRows: true };
  },
  'conversor-colores': ({ color }) => {
    if (!color?.trim()) return null;
    const c = parseColor(color); const { h, s, l } = toHsl(c); const hx = toHex(c);
    const k = 1 - Math.max(c.r, c.g, c.b) / 255; const cm = (v) => (k === 1 ? 0 : Math.round(((1 - v / 255 - k) / (1 - k)) * 100));
    const white = contrast(c, { r: 255, g: 255, b: 255 }), black = contrast(c, { r: 0, g: 0, b: 0 });
    const lvl = (x) => `${nf(x, 2)}:1 ${x >= 7 ? 'AAA' : x >= 4.5 ? 'AA' : x >= 3 ? 'AA texto grande' : '✗ insuficiente'}`;
    return { swatches: [hx], sync: { picker: hx }, rows: [['HEX', hx], ['RGB', `rgb(${c.r}, ${c.g}, ${c.b})`], ['HSL', `hsl(${h}, ${s}%, ${l}%)`], ['CMYK', `cmyk(${cm(c.r)}%, ${cm(c.g)}%, ${cm(c.b)}%, ${Math.round(k * 100)}%)`], ...(c.a < 1 ? [['Alfa', nf(c.a, 2)]] : []), ['Contraste con blanco', lvl(white)], ['Contraste con negro', lvl(black)]], copyRows: true };
  },
  'minificador-css': ({ texto }) => {
    if (!texto?.trim()) return null; const text = minifyCss(texto); const a = new Blob([texto]).size, b = new Blob([text]).size;
    return { text, filename: 'estilos.min.css', notes: [`${bytes(a)} → ${bytes(b)} (−${nf(a ? (1 - b / a) * 100 : 0, 1)} %)`] };
  },
  'formateador-css': ({ texto }) => (texto?.trim() ? { text: formatCss(texto), filename: 'estilos.css' } : null),
  'decodificador-jwt': ({ texto }) => {
    const t = texto?.trim(); if (!t) return null;
    const p = t.replace(/^Bearer\s+/i, '').split('.'); need(p.length === 3 || p.length === 5, 'Un JWT tiene tres partes separadas por puntos (cabecera.payload.firma).');
    need(p.length === 3, 'Es un JWE (token cifrado): su contenido no puede leerse sin la clave.');
    let header, payload; try { header = JSON.parse(b64decode(p[0])); payload = JSON.parse(b64decode(p[1])); } catch { throw new ToolError('El token no contiene JSON válido en la cabecera o el payload.'); }
    const date = (s) => `${new Date(s * 1000).toLocaleString('es-ES')} (${rel(s * 1000 - Date.now())})`;
    const rows = [['Algoritmo', header.alg ?? '—']];
    if (payload.iat) rows.push(['Emitido (iat)', date(payload.iat)]); if (payload.nbf) rows.push(['Válido desde (nbf)', date(payload.nbf)]);
    if (payload.exp) rows.push(['Caduca (exp)', date(payload.exp) + (payload.exp * 1000 < Date.now() ? ' — CADUCADO' : '')]);
    return { rows, text: `// Cabecera\n${JSON.stringify(header, null, 2)}\n\n// Payload\n${JSON.stringify(payload, null, 2)}`, notes: ['La firma no se verifica: comprueba siempre el token en tu servidor.'] };
  },
};
