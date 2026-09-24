// Fuente única de unidades: la usan el build (metadata, páginas /conversor) y el navegador.
// factor = cuántas unidades base vale 1 unidad. Definiciones exactas cuando existen.
export const UNITS = {
  longitud: { base: 'm', units: {
    km: ['Kilómetro', 1000], m: ['Metro', 1], cm: ['Centímetro', 0.01], mm: ['Milímetro', 0.001], um: ['Micrómetro', 1e-6],
    mi: ['Milla', 1609.344], yd: ['Yarda', 0.9144], ft: ['Pie', 0.3048], in: ['Pulgada', 0.0254], nmi: ['Milla náutica', 1852],
  } },
  peso: { base: 'kg', units: {
    t: ['Tonelada', 1000], kg: ['Kilogramo', 1], g: ['Gramo', 0.001], mg: ['Miligramo', 1e-6],
    lb: ['Libra', 0.45359237], oz: ['Onza', 0.028349523125], st: ['Stone', 6.35029318],
  } },
  temperatura: { base: 'c', units: { c: ['Grado Celsius'], f: ['Grado Fahrenheit'], k: ['Kelvin'] } },
  velocidad: { base: 'ms', units: {
    kmh: ['Kilómetro por hora', 1 / 3.6], ms: ['Metro por segundo', 1], mph: ['Milla por hora', 0.44704], kn: ['Nudo', 1852 / 3600], fts: ['Pie por segundo', 0.3048],
  } },
  tiempo: { base: 's', units: {
    ms: ['Milisegundo', 0.001], s: ['Segundo', 1], min: ['Minuto', 60], h: ['Hora', 3600], d: ['Día', 86400], sem: ['Semana', 604800], mes: ['Mes (30,44 días)', 2629746], a: ['Año (365,25 días)', 31557600],
  } },
  area: { base: 'm2', units: {
    km2: ['Kilómetro cuadrado', 1e6], ha: ['Hectárea', 1e4], a: ['Área', 100], m2: ['Metro cuadrado', 1], cm2: ['Centímetro cuadrado', 1e-4],
    mi2: ['Milla cuadrada', 2589988.110336], ac: ['Acre', 4046.8564224], ft2: ['Pie cuadrado', 0.09290304], in2: ['Pulgada cuadrada', 0.00064516],
  } },
  volumen: { base: 'l', units: {
    m3: ['Metro cúbico', 1000], l: ['Litro', 1], dl: ['Decilitro', 0.1], cl: ['Centilitro', 0.01], ml: ['Mililitro', 0.001],
    galus: ['Galón (EE. UU.)', 3.785411784], galuk: ['Galón (imperial)', 4.54609], floz: ['Onza líquida (EE. UU.)', 0.0295735295625], cup: ['Taza (EE. UU.)', 0.2365882365],
  } },
  energia: { base: 'j', units: {
    j: ['Julio', 1], kj: ['Kilojulio', 1000], cal: ['Caloría', 4.184], kcal: ['Kilocaloría', 4184], wh: ['Vatio hora', 3600], kwh: ['Kilovatio hora', 3.6e6], btu: ['BTU', 1055.05585262],
  } },
  datos: { base: 'b', units: {
    bit: ['Bit', 0.125], b: ['Byte', 1], kb: ['Kilobyte (1000)', 1e3], mb: ['Megabyte (1000²)', 1e6], gb: ['Gigabyte (1000³)', 1e9], tb: ['Terabyte (1000⁴)', 1e12],
    kib: ['Kibibyte (1024)', 1024], mib: ['Mebibyte (1024²)', 1048576], gib: ['Gibibyte (1024³)', 1073741824], tib: ['Tebibyte (1024⁴)', 1099511627776],
  } },
  frecuencia: { base: 'hz', units: {
    hz: ['Hercio', 1], khz: ['Kilohercio', 1e3], mhz: ['Megahercio', 1e6], ghz: ['Gigahercio', 1e9], rpm: ['Revoluciones por minuto', 1 / 60],
  } },
  presion: { base: 'pa', units: {
    pa: ['Pascal', 1], hpa: ['Hectopascal', 100], kpa: ['Kilopascal', 1000], bar: ['Bar', 1e5], atm: ['Atmósfera', 101325], psi: ['PSI (lbf/in²)', 6894.757293168], mmhg: ['Milímetro de mercurio', 133.322387415],
  } },
};

const toC = { c: (v) => v, f: (v) => (v - 32) * 5 / 9, k: (v) => v - 273.15 };
const fromC = { c: (v) => v, f: (v) => v * 9 / 5 + 32, k: (v) => v + 273.15 };

export function convert(kind, value, from, to) {
  const table = UNITS[kind];
  if (!table || !table.units[from] || !table.units[to]) throw new Error('Unidad desconocida');
  if (kind === 'temperatura') return fromC[to](toC[from](value));
  return (value * table.units[from][1]) / table.units[to][1];
}

// Formato legible sin notación científica salvo en extremos.
export function fmt(n) {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a !== 0 && (a < 1e-6 || a >= 1e15)) return n.toExponential(6).replace('.', ',');
  return n.toLocaleString('es-ES', { maximumFractionDigits: a < 1 ? 10 : 6 });
}

// Pares curados para páginas /conversor/<a>-a-<b>: solo búsquedas reales y frecuentes.
export const PAIRS = [
  ['peso', 'kg', 'lb'], ['peso', 'lb', 'kg'], ['peso', 'g', 'oz'], ['peso', 'oz', 'g'],
  ['longitud', 'km', 'mi'], ['longitud', 'mi', 'km'], ['longitud', 'cm', 'in'], ['longitud', 'in', 'cm'], ['longitud', 'm', 'ft'], ['longitud', 'ft', 'm'],
  ['temperatura', 'c', 'f'], ['temperatura', 'f', 'c'],
  ['velocidad', 'kmh', 'mph'], ['velocidad', 'mph', 'kmh'], ['velocidad', 'kn', 'kmh'],
  ['volumen', 'l', 'galus'], ['volumen', 'galus', 'l'], ['volumen', 'ml', 'floz'],
  ['energia', 'kcal', 'kj'], ['energia', 'kj', 'kcal'],
  ['datos', 'mb', 'gb'], ['datos', 'gb', 'mb'], ['datos', 'gib', 'gb'],
  ['presion', 'bar', 'psi'], ['presion', 'psi', 'bar'],
  ['area', 'm2', 'ft2'], ['area', 'ha', 'ac'],
];

// Slugs cortos en URL: /conversor/kg-a-lb
export const UNIT_SLUG = { kmh: 'kmh', galus: 'galones', floz: 'onzas-liquidas', m2: 'm2', ft2: 'pies2', c: 'celsius', f: 'fahrenheit', mi: 'millas', kn: 'nudos' };
export const unitSlug = (u) => UNIT_SLUG[u] || u;
