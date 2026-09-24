// Tipos de cambio vía Frankfurter (https://frankfurter.dev, datos de bancos centrales).
// Se sirven desde nuestro dominio: el navegador no contacta con terceros y la CSP sigue en 'self'.
import { json, fail, logError } from './lib.js';

const TTL = 3600e3; // ponytail: caché en memoria por instancia; los tipos de referencia cambian una vez al día
let cache = null;

export async function rates(env = process.env) {
  if (cache && Date.now() - cache.at < TTL) return json(cache.data, 200, { 'cache-control': 'public, max-age=3600' });
  try {
    const res = await fetch(`${env.RATES_API || 'https://api.frankfurter.dev/v2'}/rates?base=EUR`, { signal: AbortSignal.timeout(8000), headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error('respuesta inesperada');
    const r = { EUR: 1 }; let date = '';
    for (const x of list) if (/^[A-Z]{3}$/.test(x?.quote) && Number.isFinite(x.rate) && x.rate > 0) { r[x.quote] = x.rate; if (x.date > date) date = x.date; }
    if (Object.keys(r).length < 10) throw new Error('muy pocas monedas');
    cache = { at: Date.now(), data: { base: 'EUR', date, rates: r, source: 'Frankfurter' } };
    return json(cache.data, 200, { 'cache-control': 'public, max-age=3600' });
  } catch (e) {
    logError('rates', e);
    if (cache) return json({ ...cache.data, stale: true }, 200, { 'cache-control': 'no-store' }); // mejor un tipo de hace horas que nada
    return fail(503, 'No se han podido obtener los tipos de cambio. Inténtalo en unos minutos.');
  }
}
export const resetRatesCache = () => { cache = null; };
