import { ToolError, need, bytes, nf, baseName } from './_shared.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function load(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* SVG u otros: vía <img> */ }
  const url = URL.createObjectURL(file);
  try { const im = new Image(); im.src = url; await im.decode(); return im; } catch { throw new ToolError(`«${file.name}» no se puede abrir: el archivo está dañado o no es una imagen compatible.`); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
const W = (im) => im.width || im.naturalWidth, H = (im) => im.height || im.naturalHeight;

function canvas(w, h) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  need(w * h <= 50e6, `El resultado (${w}×${h} px) es demasiado grande para procesarlo en el navegador.`);
  const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  return [c, ctx];
}

export async function encode(c, type, quality) {
  const blob = c.convertToBlob ? await c.convertToBlob({ type, quality }) : await new Promise((r) => c.toBlob(r, type, quality));
  if (!blob) throw new ToolError('Tu dispositivo no tiene memoria suficiente para esta imagen. Prueba con una más pequeña.');
  if (blob.type !== type) throw new ToolError(`Tu navegador no puede generar imágenes ${EXT[type]?.toUpperCase() || type}. Prueba con Chrome, Edge o Firefox actualizados.`, 'browser');
  return blob;
}

// Dibuja la imagen (opcionalmente escalada/rotada) sobre fondo sólido si el formato no admite transparencia.
function draw(im, { w = W(im), h = H(im), fondo, rot = 0, flip = 'no', sx = 0, sy = 0, sw = W(im), sh = H(im) } = {}) {
  const swap = rot === 90 || rot === 270; const [c, ctx] = canvas(swap ? h : w, swap ? w : h);
  if (fondo) { ctx.fillStyle = fondo; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.translate(c.width / 2, c.height / 2); ctx.rotate((rot * Math.PI) / 180);
  if (flip === 'h') ctx.scale(-1, 1); if (flip === 'v') ctx.scale(1, -1);
  ctx.drawImage(im, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  return c;
}

// Recorre los archivos con progreso y cancelación; fn devuelve { blob, name?, note? }.
async function each(files, ctx, fn) {
  need(files?.length, 'Elige al menos una imagen.');
  const out = [];
  for (const [i, f] of files.entries()) {
    if (ctx.signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    ctx.progress?.(i / files.length, `Imagen ${i + 1} de ${files.length}`);
    const im = await load(f);
    const r = await fn(im, f);
    out.push({ name: r.name || f.name, blob: r.blob, note: r.note ?? `${W(im)}×${H(im)} px · ${bytes(f.size)} → ${bytes(r.blob.size)}` });
    im.close?.();
  }
  ctx.progress?.(1);
  return { files: out };
}
const rename = (f, type) => `${baseName(f.name)}.${EXT[type]}`;
const typeOf = (f) => (f.type === 'image/png' || f.type === 'image/webp' ? f.type : 'image/jpeg');

// k-means sobre una miniatura: paleta dominante ordenada por presencia.
export function palette(data, k) {
  const px = []; for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 127) px.push([data[i], data[i + 1], data[i + 2]]);
  need(px.length, 'La imagen es completamente transparente.');
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const cs = [px[Math.floor(px.length / 2)]];
  while (cs.length < k) { let best = px[0], bd = -1; for (let i = 0; i < px.length; i += Math.max(1, Math.floor(px.length / 3000))) { const d = Math.min(...cs.map((c) => d2(c, px[i]))); if (d > bd) { bd = d; best = px[i]; } } if (bd <= 0) break; cs.push(best); }
  let counts = [];
  for (let it = 0; it < 12; it++) {
    const sum = cs.map(() => [0, 0, 0]); counts = cs.map(() => 0);
    for (const p of px) { let bi = 0, bd = Infinity; cs.forEach((c, i) => { const d = d2(c, p); if (d < bd) { bd = d; bi = i; } }); sum[bi][0] += p[0]; sum[bi][1] += p[1]; sum[bi][2] += p[2]; counts[bi]++; }
    cs.forEach((c, i) => { if (counts[i]) cs[i] = sum[i].map((s) => Math.round(s / counts[i])); });
  }
  return cs.map((c, i) => [c, counts[i] / px.length]).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]);
}

export function ico(pngs) { // pngs: [{ size, data: Uint8Array }]
  const head = new DataView(new ArrayBuffer(6 + 16 * pngs.length)); head.setUint16(2, 1, true); head.setUint16(4, pngs.length, true);
  let off = head.byteLength;
  pngs.forEach(({ size, data }, i) => { const o = 6 + i * 16; head.setUint8(o, size >= 256 ? 0 : size); head.setUint8(o + 1, size >= 256 ? 0 : size); head.setUint16(o + 4, 1, true); head.setUint16(o + 6, 32, true); head.setUint32(o + 8, data.length, true); head.setUint32(o + 12, off, true); off += data.length; });
  return new Blob([head, ...pngs.map((p) => p.data)], { type: 'image/x-icon' });
}
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

const conv = ({ archivos, calidad = 92, fondo }, ctx) => each(archivos, ctx, async (im, f) => {
  const type = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[ctx.options.to];
  const blob = await encode(draw(im, { fondo: type === 'image/jpeg' ? fondo || '#ffffff' : null }), type, calidad / 100);
  return { blob, name: rename(f, type) };
});

export default {
  'comprimir-imagen': ({ archivos, calidad, formato, maxlado }, ctx) => each(archivos, ctx, async (im, f) => {
    const s = maxlado > 0 ? Math.min(1, maxlado / Math.max(W(im), H(im))) : 1;
    const opts = { w: W(im) * s, h: H(im) * s };
    // Automático: conserva el formato; PNG (sin compresión con pérdida) pasa a WebP, que mantiene la transparencia.
    const cand = formato === 'auto' ? [f.type === 'image/png' || f.type === 'image/gif' || f.type === 'image/bmp' ? 'image/webp' : typeOf(f)] : [`image/${formato}`];
    let best = null;
    for (const t of cand) {
      try { const b = await encode(draw(im, { ...opts, fondo: t === 'image/jpeg' ? '#ffffff' : null }), t, calidad / 100); if (!best || b.size < best.size) best = b; } catch (e) { if (formato !== 'auto' || e.code !== 'browser') throw e; }
    }
    need(best, 'Tu navegador no puede comprimir esta imagen.');
    if (best.size >= f.size && s === 1) return { blob: f, name: f.name, note: `Ya estaba optimizada (${bytes(f.size)}): se conserva el original.` };
    return { blob: best, name: rename(f, best.type), note: `${bytes(f.size)} → ${bytes(best.size)} (−${nf((1 - best.size / f.size) * 100, 0)} %)` };
  }),
  'redimensionar-imagen': ({ archivos, modo, pct, ancho, alto, proporcion }, ctx) => {
    if (modo === 'pct') need(pct > 0, 'Indica un porcentaje mayor que 0.'); else need(ancho > 0 || alto > 0, 'Indica el ancho, el alto o ambos.');
    return each(archivos, ctx, async (im, f) => {
      let w, h; const iw = W(im), ih = H(im);
      if (modo === 'pct') { w = iw * pct / 100; h = ih * pct / 100; }
      else if (proporcion) { const s = Math.min(ancho > 0 ? ancho / iw : Infinity, alto > 0 ? alto / ih : Infinity); w = iw * s; h = ih * s; }
      else { w = ancho > 0 ? ancho : iw; h = alto > 0 ? alto : ih; }
      const type = typeOf(f);
      const blob = await encode(draw(im, { w, h, fondo: type === 'image/jpeg' ? '#ffffff' : null }), type, 0.92);
      return { blob, name: `${baseName(f.name)}-${Math.round(w)}x${Math.round(h)}.${EXT[type]}`, note: `${iw}×${ih} → ${Math.round(w)}×${Math.round(h)} px · ${bytes(blob.size)}` };
    });
  },
  'recortar-imagen': ({ archivos, proporcion, ancla, x = 0, y = 0, ancho, alto }, ctx) => each(archivos, ctx, async (im, f) => {
    const iw = W(im), ih = H(im); let sx, sy, sw, sh;
    if (proporcion === 'libre') {
      need(ancho > 0 && alto > 0, 'Indica el ancho y el alto del recorte.');
      need(x + ancho <= iw && y + alto <= ih, `El recorte se sale de la imagen «${f.name}» (${iw}×${ih} px).`);
      [sx, sy, sw, sh] = [x, y, ancho, alto];
    } else {
      const [a, b] = proporcion.split(':').map(Number); const r = a / b;
      if (iw / ih > r) { sh = ih; sw = ih * r; } else { sw = iw; sh = iw / r; }
      const pos = (free) => (ancla === 'top' ? 0 : ancla === 'bottom' ? free : free / 2);
      sx = pos(iw - sw); sy = pos(ih - sh);
    }
    const type = typeOf(f);
    const blob = await encode(draw(im, { sx, sy, sw, sh, w: sw, h: sh }), type, 0.92);
    return { blob, name: `${baseName(f.name)}-recorte.${EXT[type]}`, note: `${Math.round(sw)}×${Math.round(sh)} px · ${bytes(blob.size)}` };
  }),
  'rotar-imagen': ({ archivos, giro, voltear }, ctx) => each(archivos, ctx, async (im, f) => {
    const type = typeOf(f);
    const c = draw(im, { rot: Number(giro), flip: voltear }); const blob = await encode(c, type, 0.92);
    return { blob, name: `${baseName(f.name)}-rotada.${EXT[type]}`, note: `${c.width}×${c.height} px · ${bytes(blob.size)}` };
  }),
  'jpg-a-png': conv, 'png-a-jpg': conv, 'webp-a-jpg': conv, 'webp-a-png': conv, 'convertir-a-webp': conv,
  'imagen-a-base64': async ({ archivos }) => {
    need(archivos?.length, 'Elige una imagen.');
    const f = archivos[0];
    const uri = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new ToolError('No se pudo leer el archivo.')); r.readAsDataURL(f); });
    return { rows: [['Tamaño original', bytes(f.size)], ['Tamaño en Base64', bytes(uri.length)]], text: uri, filename: `${baseName(f.name)}-base64.txt`, extraText: [['HTML', `<img src="${uri.slice(0, 60)}…" alt="">`], ['CSS', `background-image: url("${uri.slice(0, 60)}…");`]] };
  },
  'extraer-colores': async ({ archivos, cantidad = 6 }) => {
    need(archivos?.length, 'Elige una imagen.');
    const im = await load(archivos[0]); const s = Math.min(1, 96 / Math.max(W(im), H(im)));
    const [c, ctx] = canvas(W(im) * s, H(im) * s); ctx.drawImage(im, 0, 0, c.width, c.height);
    const p = palette(ctx.getImageData(0, 0, c.width, c.height).data, cantidad);
    return { swatches: p.map(([col]) => hex(col)), table: { head: ['Color', 'HEX', 'RGB', 'Presencia'], rows: p.map(([col, share]) => [{ swatch: hex(col) }, hex(col), `rgb(${col.join(', ')})`, `${nf(share * 100, 1)} %`]) }, text: p.map(([col]) => hex(col)).join('\n'), textLabel: 'Códigos HEX' };
  },
  'generador-favicon': async ({ archivos, fondo, margen = 0 }, ctx) => {
    need(archivos?.length, 'Elige una imagen.');
    const im = await load(archivos[0]);
    const icon = async (size, bg) => {
      const [c, g] = canvas(size, size); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
      const inner = size * (1 - (margen / 100) * 2); const s = inner / Math.max(W(im), H(im));
      g.drawImage(im, (size - W(im) * s) / 2, (size - H(im) * s) / 2, W(im) * s, H(im) * s);
      return encode(c, 'image/png');
    };
    ctx.progress?.(0.2, 'Generando tamaños');
    const small = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: new Uint8Array(await (await icon(size)).arrayBuffer()) })));
    const files = [
      { name: 'favicon.ico', blob: ico(small), note: '16, 32 y 48 px' },
      { name: 'favicon-32x32.png', blob: await icon(32) },
      { name: 'apple-touch-icon.png', blob: await icon(180, fondo || '#ffffff'), note: '180 px con fondo' },
      { name: 'icon-192.png', blob: await icon(192) },
      { name: 'icon-512.png', blob: await icon(512) },
    ];
    const manifest = JSON.stringify({ icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] }, null, 2);
    files.push({ name: 'manifest-icons.json', blob: new Blob([manifest], { type: 'application/json' }) });
    ctx.progress?.(1);
    return { files, zipName: 'favicon.zip', text: '<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n<link rel="manifest" href="/manifest.webmanifest">', textLabel: 'Código para el <head>' };
  },
};
