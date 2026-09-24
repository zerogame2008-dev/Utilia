import { UNITS, convert, fmt } from './units-data.js';

function run({ valor, de, a }, { options }) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  const { kind } = options; const u = UNITS[kind].units;
  const r = convert(kind, valor, de, a);
  const sym = (k) => (kind === 'temperatura' ? { c: '°C', f: '°F', k: 'K' }[k] : k);
  return {
    stats: [[`${fmt(valor)} ${sym(de)} (${u[de][0].toLowerCase()}) =`, `${fmt(r)} ${sym(a)}`]],
    table: { caption: `${fmt(valor)} ${sym(de)} en todas las unidades`, head: ['Unidad', 'Valor'], rows: Object.entries(u).filter(([k]) => k !== de).map(([k, [label]]) => [`${label} (${k})`, fmt(convert(kind, valor, de, k))]) },
  };
}

export default Object.fromEntries(Object.keys(UNITS).map((k) => [`conversor-${k}`, run]));
