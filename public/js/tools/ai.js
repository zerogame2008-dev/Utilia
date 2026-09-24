import { ToolError, need } from './_shared.js';

// Las herramientas IA nunca llaman al proveedor desde el navegador: pasan por /api/ai/<slug>.
async function call(slug, body, ctx) {
  let res;
  try { res = await fetch(`/api/ai/${slug}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctx.signal }); } catch (e) {
    if (e.name === 'AbortError') throw e; throw new ToolError('No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo.', 'network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ToolError(data.error || 'El servicio de IA no está disponible en este momento.', `http_${res.status}`);
  return data;
}

export default {
  'resumir-texto': async ({ texto, formato, longitud }, ctx) => {
    need(texto?.trim().length >= 200, 'Pega un texto de al menos 200 caracteres para resumirlo.');
    ctx.progress?.(0.3, 'Generando resumen…');
    const { text } = await call('resumir-texto', { texto, formato, longitud }, ctx);
    ctx.progress?.(1);
    return { text, filename: 'resumen.txt', notes: ['Generado con IA: revisa el resumen antes de usarlo.'] };
  },
};
