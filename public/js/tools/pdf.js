import { ToolError, need, bytes, nf, baseName, parseRanges } from './_shared.js';

// Las librerías pesadas solo se descargan al usar una herramienta PDF.
let libP, jsP;
const lib = () => (libP ||= import('../vendor/pdf-lib.esm.min.js'));
const VENDOR = new URL('../vendor/pdfjs/', import.meta.url).href;
const pdfjs = () => (jsP ||= import('../vendor/pdfjs/pdf.min.mjs').then((m) => { m.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.mjs'; return m; }));

const read = async (f) => new Uint8Array(await f.arrayBuffer());
const abort = (ctx) => { if (ctx.signal?.aborted) throw new DOMException('Cancelado', 'AbortError'); };
const out = (bytesOut, name) => ({ name, blob: new Blob([bytesOut], { type: 'application/pdf' }) });

async function open(f, { forRead = false } = {}) {
  const { PDFDocument } = await lib();
  try { return await PDFDocument.load(await read(f), { ignoreEncryption: forRead, updateMetadata: false }); } catch (e) {
    if (/encrypt/i.test(e.message)) throw new ToolError(`«${f.name}» está protegido (cifrado). No se puede modificar sin la contraseña.`, 'encrypted');
    throw new ToolError(`«${f.name}» está dañado o no es un PDF válido.`, 'corrupt');
  }
}
async function render(f, ctx) {
  const m = await pdfjs();
  try { return await m.getDocument({ data: await read(f), cMapUrl: VENDOR + 'cmaps/', cMapPacked: true, standardFontDataUrl: VENDOR + 'standard_fonts/', wasmUrl: VENDOR + 'wasm/', iccUrl: VENDOR + 'iccs/', isEvalSupported: false }).promise; } catch (e) {
    if (e?.name === 'PasswordException') throw new ToolError(`«${f.name}» tiene contraseña de apertura.`, 'encrypted');
    throw new ToolError(`«${f.name}» está dañado o no es un PDF válido.`, 'corrupt');
  } finally { abort(ctx); }
}
async function pageCanvas(doc, n, dpi) {
  const page = await doc.getPage(n); const vp = page.getViewport({ scale: dpi / 72 });
  need(vp.width * vp.height <= 40e6, 'La página es demasiado grande para esa resolución. Elige una menor.');
  const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: g, canvas: c, viewport: vp }).promise;
  return { c, w: page.getViewport({ scale: 1 }).width, h: page.getViewport({ scale: 1 }).height, page };
}
const close = (d) => (d.loadingTask?.destroy ? d.loadingTask.destroy() : d.destroy?.());
const toBlob = (c, type, q) => new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new ToolError('No hay memoria suficiente para generar la imagen.'))), type, q));
const groups = (spec, total) => String(spec).split(',').map((s) => s.trim()).filter(Boolean).map((g) => parseRanges(g, total));

// Orientación EXIF de un JPEG (1 = normal). Las JPG giradas se redibujan; el resto se incrustan tal cual.
export function exifOrientation(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) return 1; const marker = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
    if (marker === 0xe1 && String.fromCharCode(...b.slice(i + 4, i + 8)) === 'Exif') {
      const t = i + 10; const le = b[t] === 0x49; const u16 = (o) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
      const u32 = (o) => (le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0 : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0);
      const ifd = t + u32(t + 4); const n = u16(ifd);
      for (let k = 0; k < n; k++) { const e = ifd + 2 + k * 12; if (u16(e) === 0x0112) return u16(e + 8); }
      return 1;
    }
    if (marker === 0xda) return 1; i += 2 + len;
  }
  return 1;
}

const SIZES = { a4: [595.28, 841.89], carta: [612, 792] };
async function imagesToPdf({ archivos, tamano, margen }, ctx) {
  need(archivos?.length, 'Elige al menos una imagen.');
  const { PDFDocument } = await lib(); const doc = await PDFDocument.create(); const m = Number(margen) || 0;
  for (const [i, f] of archivos.entries()) {
    abort(ctx); ctx.progress?.(i / archivos.length, `Imagen ${i + 1} de ${archivos.length}`);
    let b = await read(f), img;
    try {
      if (f.type === 'image/png') img = await doc.embedPng(b);
      else if (f.type === 'image/jpeg' && exifOrientation(b) === 1) img = await doc.embedJpg(b);
      else { // WebP o JPG con rotación EXIF: se normaliza con canvas
        const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0);
        img = await doc.embedJpg(new Uint8Array(await (await toBlob(c, 'image/jpeg', 0.92)).arrayBuffer()));
      }
    } catch (e) { if (e instanceof ToolError) throw e; throw new ToolError(`«${f.name}» está dañada o no es una imagen compatible.`, 'corrupt'); }
    let [pw, ph] = tamano === 'imagen' ? [img.width * 0.75 + m * 2, img.height * 0.75 + m * 2] : SIZES[tamano];
    if (tamano !== 'imagen' && img.width > img.height) [pw, ph] = [ph, pw];
    const s = Math.min((pw - m * 2) / img.width, (ph - m * 2) / img.height);
    doc.addPage([pw, ph]).drawImage(img, { x: (pw - img.width * s) / 2, y: (ph - img.height * s) / 2, width: img.width * s, height: img.height * s });
  }
  ctx.progress?.(1);
  const name = archivos.length === 1 ? `${baseName(archivos[0].name)}.pdf` : 'imagenes.pdf';
  const r = out(await doc.save(), name);
  return { files: [{ ...r, note: `${archivos.length} página${archivos.length > 1 ? 's' : ''} · ${bytes(r.blob.size)}` }] };
}

async function copy(src, indices) {
  const { PDFDocument } = await lib(); const doc = await PDFDocument.create();
  (await doc.copyPages(src, indices)).forEach((p) => doc.addPage(p));
  return doc.save();
}
const one = (files) => { need(files?.length, 'Elige un archivo PDF.'); return files[0]; };

export default {
  describe: async (f) => { if (f.type !== 'application/pdf') return ''; try { const d = await open(f, { forRead: true }); const n = d.getPageCount(); return `${n} página${n === 1 ? '' : 's'}`; } catch (e) { return e.code === 'encrypted' ? 'Protegido' : 'No válido'; } },

  'unir-pdf': async ({ archivos }, ctx) => {
    need(archivos?.length >= 2, 'Elige al menos dos PDF para unirlos.');
    const { PDFDocument } = await lib(); const doc = await PDFDocument.create();
    for (const [i, f] of archivos.entries()) { abort(ctx); ctx.progress?.(i / archivos.length, `Añadiendo ${f.name}`); const src = await open(f); (await doc.copyPages(src, src.getPageIndices())).forEach((p) => doc.addPage(p)); }
    ctx.progress?.(0.95, 'Guardando'); const r = out(await doc.save(), 'unido.pdf');
    return { files: [{ ...r, note: `${doc.getPageCount()} páginas · ${bytes(r.blob.size)}` }] };
  },
  'dividir-pdf': async ({ archivos, modo, paginas }, ctx) => {
    const f = one(archivos); const src = await open(f); const total = src.getPageCount(); const base = baseName(f.name);
    const sets = modo === 'todas' ? src.getPageIndices().map((i) => [i]) : (need(paginas?.trim(), 'Indica las páginas o rangos.'), modo === 'extraer' ? [parseRanges(paginas, total)] : groups(paginas, total));
    need(sets.length <= 2000, 'Demasiados archivos de salida.');
    const files = [];
    for (const [i, set] of sets.entries()) {
      abort(ctx); ctx.progress?.(i / sets.length, `Creando ${i + 1} de ${sets.length}`);
      const label = set.length === 1 ? `p${set[0] + 1}` : `p${set[0] + 1}-${set.at(-1) + 1}`;
      files.push({ ...out(await copy(src, set), `${base}-${label}.pdf`), note: `${set.length} página${set.length > 1 ? 's' : ''}` });
    }
    ctx.progress?.(1);
    return { files, zipName: `${base}-dividido.zip` };
  },
  'comprimir-pdf': async ({ archivos, nivel }, ctx) => {
    const f = one(archivos); let result;
    if (nivel === 'sin') {
      const d = await open(f); ctx.progress?.(0.5, 'Optimizando');
      result = await d.save({ useObjectStreams: true });
    } else {
      const [dpi, q] = nivel === 'extrema' ? [96, 0.5] : [150, 0.7];
      const src = await render(f, ctx); const { PDFDocument } = await lib(); const doc = await PDFDocument.create();
      for (let n = 1; n <= src.numPages; n++) {
        abort(ctx); ctx.progress?.((n - 1) / src.numPages, `Página ${n} de ${src.numPages}`);
        const { c, w, h, page } = await pageCanvas(src, n, dpi);
        const jpg = await doc.embedJpg(new Uint8Array(await (await toBlob(c, 'image/jpeg', q)).arrayBuffer()));
        doc.addPage([w, h]).drawImage(jpg, { x: 0, y: 0, width: w, height: h }); page.cleanup(); c.width = c.height = 0;
      }
      result = await doc.save(); close(src);
    }
    ctx.progress?.(1);
    if (result.length >= f.size) return { notes: [`Tu PDF ya está optimizado: el resultado (${bytes(result.length)}) no pesa menos que el original (${bytes(f.size)}).${nivel === 'sin' ? ' Prueba la compresión fuerte si tiene imágenes o es un escaneo.' : ''}`] };
    return { files: [{ ...out(result, `${baseName(f.name)}-comprimido.pdf`), note: `${bytes(f.size)} → ${bytes(result.length)} (−${nf((1 - result.length / f.size) * 100, 0)} %)` }] };
  },
  'rotar-pdf': async ({ archivos, giro, paginas }) => {
    const f = one(archivos); const d = await open(f); const { degrees } = await lib();
    const idx = paginas?.trim() ? new Set(parseRanges(paginas, d.getPageCount())) : null;
    d.getPages().forEach((p, i) => { if (!idx || idx.has(i)) p.setRotation(degrees((p.getRotation().angle + Number(giro)) % 360)); });
    return { files: [out(await d.save(), `${baseName(f.name)}-rotado.pdf`)] };
  },
  'eliminar-paginas-pdf': async ({ archivos, paginas }) => {
    const f = one(archivos); const d = await open(f); need(paginas?.trim(), 'Indica qué páginas quieres eliminar.');
    const del = new Set(parseRanges(paginas, d.getPageCount())); const keep = d.getPageIndices().filter((i) => !del.has(i));
    need(keep.length, 'No puedes eliminar todas las páginas: el PDF quedaría vacío.');
    return { files: [{ ...out(await copy(d, keep), `${baseName(f.name)}-editado.pdf`), note: `${del.size} eliminada${del.size > 1 ? 's' : ''} · quedan ${keep.length}` }] };
  },
  'reordenar-paginas-pdf': async ({ archivos, modo, paginas }) => {
    const f = one(archivos); const d = await open(f);
    const order = modo === 'invertir' ? d.getPageIndices().reverse() : (need(paginas?.trim(), 'Escribe el nuevo orden de páginas.'), parseRanges(paginas, d.getPageCount()));
    return { files: [{ ...out(await copy(d, order), `${baseName(f.name)}-reordenado.pdf`), note: `${order.length} páginas` }] };
  },
  'jpg-a-pdf': imagesToPdf,
  'png-a-pdf': imagesToPdf,
  'pdf-a-jpg': async ({ archivos, formato, ppp, paginas }, ctx) => {
    const f = one(archivos); const doc = await render(f, ctx);
    const list = paginas?.trim() ? parseRanges(paginas, doc.numPages) : [...Array(doc.numPages).keys()];
    const type = formato === 'png' ? 'image/png' : 'image/jpeg'; const ext = formato === 'png' ? 'png' : 'jpg'; const files = [];
    for (const [k, i] of list.entries()) {
      abort(ctx); ctx.progress?.(k / list.length, `Página ${i + 1}`);
      const { c, page } = await pageCanvas(doc, i + 1, Number(ppp));
      files.push({ name: `${baseName(f.name)}-p${i + 1}.${ext}`, blob: await toBlob(c, type, 0.9), note: `${c.width}×${c.height} px` }); page.cleanup(); c.width = c.height = 0;
    }
    close(doc); ctx.progress?.(1);
    return { files, zipName: `${baseName(f.name)}-imagenes.zip` };
  },
  'pdf-a-texto': async ({ archivos, paginas }, ctx) => {
    const f = one(archivos); const doc = await render(f, ctx);
    const list = paginas?.trim() ? parseRanges(paginas, doc.numPages) : [...Array(doc.numPages).keys()]; const parts = [];
    for (const [k, i] of list.entries()) {
      abort(ctx); ctx.progress?.(k / list.length, `Página ${i + 1}`);
      const tc = await (await doc.getPage(i + 1)).getTextContent();
      parts.push(`--- Página ${i + 1} ---\n` + tc.items.map((it) => (it.str ?? '') + (it.hasEOL ? '\n' : '')).join('').replace(/[ \t]+\n/g, '\n').trim());
    }
    close(doc); ctx.progress?.(1);
    const text = parts.join('\n\n'); const chars = text.replace(/--- Página \d+ ---/g, '').trim().length;
    return { text, filename: `${baseName(f.name)}.txt`, notes: chars ? [] : ['No se ha encontrado texto: probablemente es un PDF escaneado (solo imágenes).'] };
  },
  'contador-paginas-pdf': async ({ archivos }, ctx) => {
    need(archivos?.length, 'Elige al menos un PDF.'); const rows = []; let total = 0;
    for (const [i, f] of archivos.entries()) {
      abort(ctx); ctx.progress?.(i / archivos.length);
      try { const n = (await open(f, { forRead: true })).getPageCount(); total += n; rows.push([f.name, nf(n, 0)]); } catch (e) { rows.push([f.name, e.message.includes('protegido') ? 'Protegido' : 'No válido']); }
    }
    ctx.progress?.(1);
    return { stats: [['Páginas en total', nf(total, 0)], ['Archivos', archivos.length]], table: { head: ['Archivo', 'Páginas'], rows } };
  },
  'analizador-pdf': async ({ archivos }) => {
    const f = one(archivos); const raw = await read(f);
    const head = new TextDecoder('latin1').decode(raw.slice(0, 1024)); const version = head.match(/%PDF-(\d\.\d)/)?.[1];
    const d = await open(f, { forRead: true }); const p = d.getPage(0); const { width, height } = p.getSize();
    const mm = (pt) => Math.round((pt * 25.4) / 72); const fmtD = (x) => (x ? x.toLocaleString('es-ES') : '—');
    let fields = 0; try { fields = d.getForm().getFields().length; } catch { /* sin formulario */ }
    return {
      stats: [['Páginas', nf(d.getPageCount(), 0)], ['Tamaño', bytes(f.size)], ['Versión', version ? `PDF ${version}` : '—']],
      rows: [['Título', d.getTitle() || '—'], ['Autor', d.getAuthor() || '—'], ['Asunto', d.getSubject() || '—'], ['Palabras clave', d.getKeywords() || '—'], ['Creado con', d.getCreator() || '—'], ['Productor', d.getProducer() || '—'], ['Fecha de creación', fmtD(d.getCreationDate())], ['Última modificación', fmtD(d.getModificationDate())],
        ['Tamaño de la 1.ª página', `${mm(width)} × ${mm(height)} mm${Math.abs(mm(width) - 210) <= 1 && Math.abs(mm(height) - 297) <= 1 ? ' (A4)' : ''}`], ['Campos de formulario', nf(fields, 0)], ['Cifrado', d.isEncrypted ? 'Sí' : 'No'], ['Linealizado (vista web rápida)', /\/Linearized/.test(head) ? 'Sí' : 'No']],
    };
  },
};
