// Búsqueda tolerante: sin tildes, plurales, sinónimos («foto» → jpg/png/webp) y dirección («X a Y»).
export const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n');
const stem = (w) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
const STOP = new Set('a al de del el la las lo los un una unos en y o u para por con sin mi mis tu que como se me quiero necesito hacer online gratis gratuito herramienta herramientas mas un'.split(' '));
const SYN = {
  foto: ['imagen', 'jpg', 'png', 'webp', 'foto'], imagen: ['imagen', 'jpg', 'png', 'webp'], jpeg: ['jpg'], img: ['imagen'],
  pasar: ['convertir', 'pasar'], cambiar: ['convertir', 'cambiar'], transformar: ['convertir'], convierte: ['convertir'],
  juntar: ['unir', 'juntar'], combinar: ['unir'], fusionar: ['unir'], separar: ['dividir', 'separar'], cortar: ['dividir', 'recortar'], partir: ['dividir'],
  reducir: ['comprimir', 'reducir'], achicar: ['comprimir'], aligerar: ['comprimir'], optimizar: ['comprimir', 'optimizar'], girar: ['rotar', 'girar'], voltear: ['rotar'],
  borrar: ['eliminar', 'quitar'], quitar: ['eliminar', 'quitar', 'limpiar'], contar: ['contador', 'contar'], cuenta: ['contador'], calcular: ['calculadora', 'calcular'], calcula: ['calculadora'],
  impuesto: ['iva'], porciento: ['porcentaje'], kilo: ['kg', 'peso', 'kilo'], grado: ['temperatura', 'celsius', 'grado'], milla: ['millas', 'longitud'],
  clave: ['contrasena', 'clave'], password: ['contrasena'], md5: ['hash'], sha256: ['hash'], sha: ['hash'], guid: ['uuid'], fecha: ['fecha', 'edad', 'timestamp'], dia: ['fecha', 'dia'],
  dolar: ['moneda', 'dolare'], euro: ['moneda', 'euro'], peso: ['moneda', 'peso'], divisa: ['moneda'], libra: ['moneda', 'lb', 'peso'],
  color: ['colore', 'color'], tamano: ['redimensionar', 'comprimir', 'tamano'], tamanio: ['redimensionar'], texto: ['texto'], letra: ['caracter', 'mayuscula'],
};
const FIELDS = [['n', 6], ['k', 4], ['cn', 2], ['d', 1]];
const cache = new WeakMap();
const prep = (t) => { let p = cache.get(t); if (!p) { p = Object.fromEntries(FIELDS.map(([f]) => [f, norm(t[f] || '').split(/[^a-z0-9%]+/).filter(Boolean).map(stem)])); p.full = norm(`${t.n} | ${t.k}`); p.name = norm(t.n); cache.set(t, p); } return p; };

export function search(index, query, { limit = 8 } = {}) {
  const q = norm(query).trim(); if (!q) return [];
  const tokens = q.split(/[^a-z0-9%]+/).filter((w) => w && !STOP.has(w));
  if (!tokens.length) return [];
  const exp = tokens.map((w) => [...new Set([stem(w), ...(SYN[stem(w)] || SYN[w] || []).map(stem)])]);
  const [left, right] = q.includes(' a ') ? q.split(' a ', 2).map((s) => s.split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem)) : [];
  const out = [];
  for (const t of index) {
    const p = prep(t); let score = 0, matched = 0;
    for (const alts of exp) {
      let best = 0;
      for (const [f, wgt] of FIELDS) for (const w of p[f]) for (const a of alts) { if (w === a) best = Math.max(best, wgt * 1.5); else if (a.length >= 2 && w.startsWith(a)) best = Math.max(best, wgt); }
      if (best) { matched++; score += best; }
    }
    if (!matched) continue;
    if (p.full.includes(q)) score += 10;
    if (left?.length && right?.length && p.name.includes(' a ')) { // «foto a pdf» favorece «JPG a PDF» frente a «PDF a JPG»
      const [nl, nr] = p.name.split(' a ').map((s) => s.split(/\s+/).map(stem));
      const hit = (side, words) => side.some((x) => [x, ...(SYN[x] || [])].map(stem).some((a) => words.some((w) => w.startsWith(a))));
      if (hit(left, nl) && hit(right, nr)) score += 8; else if (hit(left, nr) && hit(right, nl)) score -= 4;
    }
    out.push([t, matched, score]);
  }
  const need = tokens.length > 2 ? tokens.length - 1 : tokens.length;
  const strict = out.filter(([, m]) => m >= need);
  return (strict.length ? strict : out).sort((a, b) => b[1] - a[1] || b[2] - a[2] || b[0].p - a[0].p).slice(0, limit).map(([t]) => t);
}
