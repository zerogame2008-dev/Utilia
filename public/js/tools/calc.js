import { nf, money, need, ToolError } from './_shared.js';

const has = (...v) => v.every((x) => typeof x === 'number' && Number.isFinite(x));
const DAY = 86400000;
// Fechas como días UTC para que el cambio de hora no altere los recuentos.
const utc = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fmtDate = (t) => new Date(t).toLocaleDateString('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// Años/meses/días entre dos fechas, estilo calendario (29-feb cumple el 1-mar en años no bisiestos).
export function ymd(a, b) {
  const A = new Date(a), B = new Date(b);
  let y = B.getUTCFullYear() - A.getUTCFullYear(), m = B.getUTCMonth() - A.getUTCMonth(), d = B.getUTCDate() - A.getUTCDate();
  if (d < 0) { m--; d += new Date(Date.UTC(B.getUTCFullYear(), B.getUTCMonth(), 0)).getUTCDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
}

export function workdays(a, b) {
  let n = 0; const days = Math.round((b - a) / DAY); const full = Math.floor(days / 7);
  n = full * 5; const start = new Date(a).getUTCDay();
  for (let i = 0; i < days % 7; i++) { const wd = (start + i) % 7; if (wd !== 0 && wd !== 6) n++; }
  return n;
}

export function parseTime(s) {
  const p = String(s || '').trim().split(':').map((x) => x.trim());
  need(p.length >= 1 && p.length <= 3 && p.every((x) => /^\d+(\.\d+)?$/.test(x)), 'Escribe el tiempo como hh:mm:ss o mm:ss.');
  return p.reduce((acc, x) => acc * 60 + Number(x), 0) * (p.length === 1 ? 60 : 1);
}
export const hms = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(x).padStart(2, '0')}`; };

// «7,5» suelto es decimal; «7, 8» o «7,8,9» (2+ comas) son listas.
export function numbers(s) {
  const out = [];
  for (let t of String(s || '').split(/[\s;]+/)) {
    t = t.replace(/,+$/, ''); if (!t) continue;
    const parts = (t.match(/,/g) || []).length > 1 ? t.split(',') : [t.replace(',', '.')];
    for (const p of parts) { const v = Number(p); if (p === '' || !Number.isFinite(v)) throw new ToolError(`«${t}» no es un número.`); out.push(v); }
  }
  return out;
}

export function compound({ capital = 0, aporte = 0, tasa, anios, freq = 12 }) {
  const r = tasa / 100; const rows = []; let bal = capital, invested = capital;
  const monthly = Math.pow(1 + r / freq, freq / 12) - 1; // tipo mensual equivalente
  for (let y = 1; y <= anios; y++) { for (let m = 0; m < 12; m++) { bal = bal * (1 + monthly) + aporte; invested += aporte; } rows.push([y, invested, bal]); }
  return rows;
}

export default {
  'calculadora-porcentajes': ({ modo, x, y }) => {
    if (!has(x, y)) return null;
    const r = { de: [y * x / 100, `${nf(y)} × ${nf(x)} ÷ 100`, `El ${nf(x)} % de ${nf(y)}`], que: [y ? x / y * 100 : NaN, `${nf(x)} ÷ ${nf(y)} × 100`, `${nf(x)} respecto a ${nf(y)}`, '%'], var: [x ? (y - x) / Math.abs(x) * 100 : NaN, `(${nf(y)} − ${nf(x)}) ÷ ${nf(x)} × 100`, `De ${nf(x)} a ${nf(y)}`, '%'], mas: [y * (1 + x / 100), `${nf(y)} × (1 + ${nf(x)} ÷ 100)`, `${nf(y)} + ${nf(x)} %`], menos: [y * (1 - x / 100), `${nf(y)} × (1 − ${nf(x)} ÷ 100)`, `${nf(y)} − ${nf(x)} %`] }[modo];
    need(Number.isFinite(r[0]), 'No se puede dividir entre cero.');
    return { stats: [[r[2], nf(r[0], 4) + (r[3] ? ' %' : '')]], rows: [['Operación', r[1]]] };
  },
  'calculadora-iva': ({ importe, tipo, otro, modo }) => {
    const pct = tipo === 'otro' ? otro : Number(tipo);
    if (!has(importe, pct)) return null;
    need(importe >= 0 && pct >= 0, 'Los valores deben ser positivos.');
    const base = modo === 'sin' ? importe : importe / (1 + pct / 100); const total = base * (1 + pct / 100);
    return { stats: [['Base imponible', money(base)], [`IVA ${nf(pct)} %`, money(total - base)], ['Total con IVA', money(total)]], rows: [['Fórmula', modo === 'sin' ? `${nf(importe)} × ${nf(1 + pct / 100, 4)}` : `${nf(importe)} ÷ ${nf(1 + pct / 100, 4)}`]] };
  },
  'regla-de-tres': ({ a, b, c, tipo }) => {
    if (!has(a, b, c)) return null;
    const x = tipo === 'directa' ? (need(a !== 0, 'A no puede ser 0.'), b * c / a) : (need(c !== 0, 'C no puede ser 0.'), a * b / c);
    return { stats: [['X', nf(x, 6)]], rows: [['Operación', tipo === 'directa' ? `${nf(b)} × ${nf(c)} ÷ ${nf(a)}` : `${nf(a)} × ${nf(b)} ÷ ${nf(c)}`], ['Lectura', `Si ${nf(a)} → ${nf(b)}, entonces ${nf(c)} → ${nf(x, 6)}`]] };
  },
  'calculadora-descuentos': ({ precio, d1, d2 = 0 }) => {
    if (!has(precio, d1)) return null;
    const f = precio * (1 - d1 / 100) * (1 - (d2 || 0) / 100);
    return { stats: [['Precio final', money(f)], ['Ahorras', money(precio - f)], ['Descuento total', nf((1 - f / precio) * 100 || 0) + ' %']] };
  },
  'interes-simple': ({ capital, tasa, plazo, unidad }) => {
    if (!has(capital, tasa, plazo)) return null;
    const t = unidad === 'a' ? plazo : unidad === 'm' ? plazo / 12 : plazo / 365; const i = capital * tasa / 100 * t;
    return { stats: [['Intereses', money(i)], ['Capital final', money(capital + i)]], rows: [['Fórmula', `${nf(capital)} × ${nf(tasa / 100, 4)} × ${nf(t, 4)} años`]] };
  },
  'interes-compuesto': ({ capital = 0, aporte = 0, tasa, anios, freq }) => {
    if (!has(tasa, anios) || !(capital > 0 || aporte > 0)) return null;
    need(anios >= 1 && anios <= 100, 'Los años deben estar entre 1 y 100.');
    const rows = compound({ capital, aporte: aporte || 0, tasa, anios: Math.round(anios), freq: Number(freq) }); const [, inv, fin] = rows.at(-1);
    return { stats: [['Capital final', money(fin)], ['Total aportado', money(inv)], ['Intereses generados', money(fin - inv)]], table: { caption: 'Evolución año a año', head: ['Año', 'Aportado', 'Saldo'], rows: rows.map(([y, a, b]) => [y, money(a), money(b)]) } };
  },
  'calculadora-edad': ({ nacimiento, referencia }) => {
    if (!nacimiento) return null;
    const a = utc(nacimiento), b = referencia ? utc(referencia) : utc(new Date().toISOString().slice(0, 10));
    need(b >= a, 'La fecha de nacimiento debe ser anterior a la fecha de referencia.');
    const { y, m, d } = ymd(a, b); const A = new Date(a);
    let next = Date.UTC(new Date(b).getUTCFullYear(), A.getUTCMonth(), A.getUTCDate()); if (next <= b) next = Date.UTC(new Date(b).getUTCFullYear() + 1, A.getUTCMonth(), A.getUTCDate());
    return { stats: [['Edad', `${y} años`], ['Y además', `${m} meses, ${d} días`], ['Días vividos', nf((b - a) / DAY, 0)]], rows: [['Semanas vividas', nf(Math.floor((b - a) / DAY / 7), 0)], ['Próximo cumpleaños', `${fmtDate(next)} (en ${nf((next - b) / DAY, 0)} días)`], ['Naciste un', new Date(a).toLocaleDateString('es-ES', { timeZone: 'UTC', weekday: 'long' })]] };
  },
  'diferencia-fechas': ({ inicio, fin, incluir }) => {
    if (!inicio || !fin) return null;
    let a = utc(inicio), b = utc(fin); const neg = b < a; if (neg) [a, b] = [b, a];
    if (incluir) b += DAY;
    const days = Math.round((b - a) / DAY); const { y, m, d } = ymd(a, b);
    return { stats: [['Días naturales', nf(days, 0)], ['Días laborables', nf(workdays(a, b), 0)], ['Semanas', `${Math.floor(days / 7)} y ${days % 7} días`]], rows: [['Equivale a', [y && `${y} año${y > 1 ? 's' : ''}`, m && `${m} mes${m > 1 ? 'es' : ''}`, `${d} día${d === 1 ? '' : 's'}`].filter(Boolean).join(', ')], ['Horas', nf(days * 24, 0)], ...(neg ? [['Nota', 'La fecha final es anterior a la inicial; se muestra la diferencia absoluta.']] : [])] };
  },
  'calculadora-imc': ({ peso, altura }) => {
    if (!has(peso, altura)) return null;
    need(altura >= 30 && altura <= 260, 'La altura debe estar en centímetros (por ejemplo, 175).');
    const h = altura / 100, imc = peso / (h * h);
    const cat = imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : imc < 35 ? 'Obesidad grado I' : imc < 40 ? 'Obesidad grado II' : 'Obesidad grado III';
    return { stats: [['IMC', nf(imc, 1)], ['Clasificación OMS', cat]], rows: [['Peso saludable para tu altura', `${nf(18.5 * h * h, 1)} – ${nf(24.9 * h * h, 1)} kg`]] };
  },
  'calculadora-calorias': ({ sexo, edad, peso, altura, actividad }) => {
    if (!has(edad, peso, altura)) return null;
    const tmb = 10 * peso + 6.25 * altura - 5 * edad + (sexo === 'h' ? 5 : -161); const tdee = tmb * Number(actividad);
    return { stats: [['Metabolismo basal', `${nf(tmb, 0)} kcal`], ['Mantenimiento', `${nf(tdee, 0)} kcal/día`]], rows: [['Pérdida moderada (−400)', `${nf(tdee - 400, 0)} kcal/día`], ['Ganancia moderada (+300)', `${nf(tdee + 300, 0)} kcal/día`]] };
  },
  'ritmo-carrera': ({ dist, km, tiempo }) => {
    const D = dist === 'otra' ? km : Number(dist); if (!has(D) || !tiempo) return null;
    const t = parseTime(tiempo); need(t > 0 && D > 0, 'El tiempo y la distancia deben ser mayores que cero.');
    const riegel = (d2) => t * Math.pow(d2 / D, 1.06);
    return { stats: [['Ritmo', `${hms(t / D)} min/km`], ['Velocidad', `${nf(D / (t / 3600), 2)} km/h`]], rows: [['Ritmo por milla', `${hms(t / D * 1.609344)} min/mi`]], table: { caption: 'Tiempos equivalentes estimados', head: ['Distancia', 'Tiempo'], rows: [['5 km', hms(riegel(5))], ['10 km', hms(riegel(10))], ['Media maratón', hms(riegel(21.0975))], ['Maratón', hms(riegel(42.195))]] } };
  },
  'calculadora-1rm': ({ peso, reps }) => {
    if (!has(peso, reps)) return null;
    need(reps >= 1 && reps <= 20, 'Las repeticiones deben estar entre 1 y 20.');
    const ep = reps === 1 ? peso : peso * (1 + reps / 30), br = peso * 36 / (37 - reps), rm = (ep + br) / 2;
    return { stats: [['1RM estimado', `${nf(rm, 1)} kg`]], rows: [['Epley', `${nf(ep, 1)} kg`], ['Brzycki', `${nf(br, 1)} kg`]], table: { caption: 'Pesos por porcentaje', head: ['% del 1RM', 'Peso', 'Reps aprox.'], rows: [[95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12], [65, 15], [60, 20]].map(([p, r]) => [`${p} %`, `${nf(rm * p / 100, 1)} kg`, r]) } };
  },
  'calculadora-media': ({ datos }) => {
    const v = numbers(datos); if (!v.length) return null;
    const s = [...v].sort((a, b) => a - b); const sum = v.reduce((a, b) => a + b, 0), mean = sum / v.length;
    const med = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    const c = new Map(); v.forEach((x) => c.set(x, (c.get(x) || 0) + 1)); const maxc = Math.max(...c.values());
    const moda = maxc > 1 ? [...c].filter(([, k]) => k === maxc).map(([x]) => nf(x, 4)).join(', ') : 'Sin moda';
    const varp = v.reduce((a, x) => a + (x - mean) ** 2, 0) / v.length; const vars = v.length > 1 ? varp * v.length / (v.length - 1) : 0;
    return { stats: [['Media', nf(mean, 4)], ['Mediana', nf(med, 4)], ['Moda', moda]], rows: [['Cantidad', v.length], ['Suma', nf(sum, 4)], ['Mínimo', nf(s[0], 4)], ['Máximo', nf(s.at(-1), 4)], ['Rango', nf(s.at(-1) - s[0], 4)], ['Desviación típica (poblacional)', nf(Math.sqrt(varp), 4)], ['Desviación típica (muestral)', nf(Math.sqrt(vars), 4)]] };
  },
  'calculadora-notas': ({ notas, objetivo, pesoRestante }) => {
    const rows = String(notas || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const p = l.replace(/%/g, '').split(/[\s;\t]+/).map((x) => Number(x.replace(',', '.')));
      need(p.length <= 2 && p.every(Number.isFinite), `La línea ${i + 1} («${l}») no tiene el formato «nota peso».`);
      return [p[0], p[1] ?? 1];
    });
    if (!rows.length) return null;
    const W = rows.reduce((a, [, w]) => a + w, 0); need(W > 0, 'La suma de pesos debe ser mayor que cero.');
    const avg = rows.reduce((a, [n, w]) => a + n * w, 0) / W;
    const out = { stats: [['Media ponderada', nf(avg, 2)], ['Peso total', nf(W, 2)]] };
    if (has(objetivo, pesoRestante) && pesoRestante > 0) { const need2 = (objetivo * (W + pesoRestante) - avg * W) / pesoRestante; out.rows = [[`Nota necesaria en lo que falta para un ${nf(objetivo)}`, nf(need2, 2)]]; }
    return out;
  },
};
