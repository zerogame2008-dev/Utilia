// Genera favicon, iconos PWA y og.png en public/root/ sin dependencias (SDF + PNG con zlib).
// Solo hace falta volver a ejecutarlo si cambia el diseño del logotipo: node scripts/make-images.js
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('../public/root/', import.meta.url);
mkdirSync(OUT, { recursive: true });

function png(w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, 'ascii'); data.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
// Distancia con signo a un rectángulo redondeado (centro c, semitamaño b, radio r).
const sdRR = (x, y, cx, cy, bx, by, r) => { const qx = Math.abs(x - cx) - bx + r, qy = Math.abs(y - cy) - by + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };

function canvas(w, h, bg) {
  const px = Buffer.alloc(w * h * 4);
  const paint = (fn, rgb, alpha = 1) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const cov = Math.min(1, Math.max(0, 0.5 - fn(x + 0.5, y + 0.5))) * alpha; if (!cov) continue; const i = (y * w + x) * 4; const a0 = px[i + 3] / 255; const a = cov + a0 * (1 - cov); for (let k = 0; k < 3; k++) px[i + k] = a ? Math.round((rgb[k] * cov + px[i + k] * a0 * (1 - cov)) / a) : 0; px[i + 3] = Math.round(a * 255); } };
  if (bg) paint(() => -1, bg);
  return { px, paint };
}

// Logotipo en una caja de 32 unidades: fondo oscuro + 4 módulos (uno de acento, uno circular).
function drawLogo(paint, ox, oy, s, { withBg = true } = {}) {
  const u = s / 32; const R = (x, y, w, h, r) => (X, Y) => sdRR(X, Y, ox + (x + w / 2) * u, oy + (y + h / 2) * u, (w / 2) * u, (h / 2) * u, r * u);
  if (withBg) paint(R(2, 2, 28, 28, 8), hex('#141826'));
  paint(R(8, 8, 7, 7, 2), hex('#7c7cff'));
  paint(R(17, 8, 7, 7, 2), hex('#e6e8ef'));
  paint(R(8, 17, 7, 7, 2), hex('#e6e8ef'));
  paint(R(17, 17, 7, 7, 3.5), hex('#e6e8ef'));
}

const icon = (size, bg) => { const c = canvas(size, size, bg ? hex(bg) : null); drawLogo(c.paint, bg ? size * 0.1 : 0, bg ? size * 0.1 : 0, bg ? size * 0.8 : size); return png(size, size, c.px); };
writeFileSync(new URL('icon-192.png', OUT), icon(192));
writeFileSync(new URL('icon-512.png', OUT), icon(512));
writeFileSync(new URL('apple-touch-icon.png', OUT), icon(180, '#0b0d12'));

const small = [16, 32, 48].map((s) => ({ s, d: icon(s) }));
const head = Buffer.alloc(6 + 16 * small.length); head.writeUInt16LE(1, 2); head.writeUInt16LE(small.length, 4);
let off = head.length; small.forEach(({ s, d }, i) => { const o = 6 + i * 16; head[o] = s; head[o + 1] = s; head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(d.length, o + 8); head.writeUInt32LE(off, o + 12); off += d.length; });
writeFileSync(new URL('favicon.ico', OUT), Buffer.concat([head, ...small.map((x) => x.d)]));

writeFileSync(new URL('favicon.svg', OUT), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="8" fill="#141826"/><rect x="8" y="8" width="7" height="7" rx="2" fill="#7c7cff"/><rect x="17" y="8" width="7" height="7" rx="2" fill="#e6e8ef"/><rect x="8" y="17" width="7" height="7" rx="2" fill="#e6e8ef"/><rect x="17" y="17" width="7" height="7" rx="3.5" fill="#e6e8ef"/></svg>\n');

// og.png 1200×630: fondo oscuro con rejilla de módulos que se desvanece y logotipo grande.
const W = 1200, H = 630; const og = canvas(W, H, hex('#0b0d12'));
for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 13; gx++) {
  const cx = 70 + gx * 90, cy = 45 + gy * 90; const d = Math.hypot(cx - 820, cy - 315) / 700; const a = Math.max(0, 0.22 - d * 0.22);
  if (a > 0.01 && !(cx < 430 && cy > 130 && cy < 500)) og.paint((x, y) => sdRR(x, y, cx, cy, 30, 30, (gx + gy) % 5 === 0 ? 30 : 10), (gx * 3 + gy) % 7 === 0 ? hex('#7c7cff') : hex('#8b93a7'), a);
}
drawLogo(og.paint, 110, 165, 300);
writeFileSync(new URL('og.png', OUT), png(W, H, og.px));
console.log('✓ imágenes generadas en public/root/');
