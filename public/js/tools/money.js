import { ToolError, need } from './_shared.js';

// Monedas del selector (fuente única: la usa también la metadata del build). El proveedor ofrece más.
export const CURRENCIES = {
  EUR: 'Euro', USD: 'Dólar estadounidense', GBP: 'Libra esterlina', CHF: 'Franco suizo', JPY: 'Yen japonés', CNY: 'Yuan chino',
  MXN: 'Peso mexicano', ARS: 'Peso argentino', COP: 'Peso colombiano', CLP: 'Peso chileno', PEN: 'Sol peruano', BRL: 'Real brasileño',
  UYU: 'Peso uruguayo', DOP: 'Peso dominicano', BOB: 'Boliviano', PYG: 'Guaraní paraguayo', GTQ: 'Quetzal guatemalteco', CRC: 'Colón costarricense',
  HNL: 'Lempira hondureño', NIO: 'Córdoba nicaragüense', PAB: 'Balboa panameño', VES: 'Bolívar venezolano', CAD: 'Dólar canadiense', AUD: 'Dólar australiano',
  NZD: 'Dólar neozelandés', SEK: 'Corona sueca', NOK: 'Corona noruega', DKK: 'Corona danesa', PLN: 'Esloti polaco', CZK: 'Corona checa',
  HUF: 'Forinto húngaro', RON: 'Leu rumano', TRY: 'Lira turca', MAD: 'Dírham marroquí', INR: 'Rupia india', KRW: 'Won surcoreano',
  HKD: 'Dólar de Hong Kong', SGD: 'Dólar de Singapur', AED: 'Dírham de los EAU', ZAR: 'Rand sudafricano',
};
const MAIN = ['EUR', 'USD', 'GBP', 'MXN', 'ARS', 'COP', 'CHF', 'JPY'];

// Tipo cruzado a partir de tipos con base EUR: a→b = r[b] / r[a].
export function cross(rates, amount, from, to) {
  need(rates[from] && rates[to], 'Esa moneda no está disponible ahora mismo.');
  return (amount * rates[to]) / rates[from];
}
const money = (n, code) => { try { return n.toLocaleString('es-ES', { style: 'currency', currency: code, maximumFractionDigits: Math.abs(n) < 1 ? 6 : 2 }); } catch { return `${n.toFixed(2)} ${code}`; } };

let ratesP;
function load(signal) {
  ratesP ||= fetch('/api/rates', { signal }).then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
    .catch((e) => { ratesP = null; if (e.name === 'AbortError') throw e; throw new ToolError('No se han podido obtener los tipos de cambio. Comprueba tu conexión e inténtalo de nuevo.', 'network'); });
  return ratesP;
}

export default {
  'conversor-moneda': async ({ importe, de, a }, ctx) => {
    if (typeof importe !== 'number' || !Number.isFinite(importe)) return null;
    need(importe >= 0, 'El importe no puede ser negativo.');
    const data = await load(); const r = data.rates;
    const out = cross(r, importe, de, a), unit = cross(r, 1, de, a);
    const fecha = new Date(`${data.date}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    return {
      stats: [[`${money(importe, de)} =`, money(out, a)]],
      rows: [['Tipo de cambio', `1 ${de} = ${unit.toLocaleString('es-ES', { maximumFractionDigits: 6 })} ${a}`], ['Inverso', `1 ${a} = ${(1 / unit).toLocaleString('es-ES', { maximumFractionDigits: 6 })} ${de}`], ['Fecha del tipo', `${fecha} (referencia de bancos centrales)`]],
      table: { caption: `${money(importe, de)} en otras monedas`, head: ['Moneda', 'Importe'], rows: MAIN.filter((c) => c !== de && c !== a && r[c]).map((c) => [`${CURRENCIES[c]} (${c})`, money(cross(r, importe, de, c), c)]) },
      notes: [data.stale ? 'No hemos podido actualizar los tipos: se muestran los últimos disponibles.' : 'Tipos de referencia: tu banco o tarjeta suele aplicar un margen del 1–3 % sobre ellos.'],
    };
  },
};
