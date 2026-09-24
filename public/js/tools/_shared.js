// Utilidades compartidas por las familias de herramientas. Sin DOM en el nivel superior
// para que la lógica pura pueda probarse con `node --test`.

// Error pensado para el usuario: su mensaje se muestra tal cual.
export class ToolError extends Error {
  constructor(message, code = 'user') { super(message); this.name = 'ToolError'; this.code = code; }
}

export const nf = (n, d = 2) => Number(n).toLocaleString('es-ES', { maximumFractionDigits: d });
export const money = (n) => Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export function bytes(n) {
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB']; let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return `${nf(n, n < 10 ? 2 : 1)} ${u[i]}`;
}

export const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function need(cond, msg) { if (!cond) throw new ToolError(msg); }

export function num(v, label, { min = -Infinity, max = Infinity } = {}) {
  need(typeof v === 'number' && Number.isFinite(v), `Introduce un número válido en «${label}».`);
  need(v >= min && v <= max, `«${label}» debe estar entre ${nf(min)} y ${nf(max)}.`);
  return v;
}

// Rango de páginas «1-3, 5, 8-» → índices base 0 ordenados como se escribieron.
export function parseRanges(spec, total) {
  const out = [];
  for (const part of String(spec).split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
    let a, b;
    if (m) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : total; } else if (/^\d+$/.test(part)) { a = b = +part; } else throw new ToolError(`«${part}» no es un rango válido. Usa por ejemplo: 1-3, 5, 8-10.`);
    need(a >= 1 && b <= total && a <= b, `El rango «${part}» no existe: el documento tiene ${total} página${total === 1 ? '' : 's'}.`);
    for (let i = a; i <= b; i++) out.push(i - 1);
  }
  need(out.length, 'Indica al menos una página.');
  return out;
}

export const baseName = (name) => name.replace(/\.[^.]+$/, '');

// ZIP sin compresión (método store): suficiente para agrupar PDF/JPG, que ya van comprimidos.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

export async function zip(files) {
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  const seen = new Map();
  for (const f of files) {
    let name = f.name; const n = seen.get(name) || 0; seen.set(name, n + 1);
    if (n) name = name.replace(/(\.[^.]+)?$/, ` (${n})$1`);
    const data = new Uint8Array(await f.blob.arrayBuffer()); const nameB = enc.encode(name); const crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nameB.length, true);
    parts.push(h, nameB, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nameB.length, true); c.setUint32(42, offset, true);
    central.push(c, nameB);
    offset += 30 + nameB.length + data.length;
  }
  const size = central.reduce((s, p) => s + p.byteLength, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, e], { type: 'application/zip' });
}
