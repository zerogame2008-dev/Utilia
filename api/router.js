import { json, fail, limited, ipKey, sameOrigin, readBody, clean, save, logError } from './lib.js';
import { runAi } from './ai.js';
import { rates } from './rates.js';
import { processors, sniff } from './process.js';

const EVENT_TYPES = new Set(['pageview', 'tool_use', 'tool_error', 'download', 'search', 'search_click', 'fav', 'unfav', 'contact']);

export async function handle(req, { ip = '0.0.0.0', env = process.env } = {}) {
  const { pathname } = new URL(req.url); const key = ipKey(ip);
  try {
    if (pathname === '/api/health') return json({ ok: true });
    if (pathname === '/api/rates' && req.method === 'GET') return limited(`rt:${key}`, 120, 3600e3) ? fail(429, 'Demasiadas peticiones.') : await rates(env);
    if (req.method !== 'POST') return fail(405, 'Método no permitido.');
    if (!sameOrigin(req, env)) return fail(403, 'Origen no permitido.');

    if (pathname === '/api/event') {
      if (env.ANALYTICS === 'off' || limited(`ev:${key}`, 300, 3600e3)) return new Response(null, { status: 204 });
      const body = await readBody(req, 2048); if (!body) return fail(413, 'Demasiado grande.');
      let e; try { e = JSON.parse(new TextDecoder().decode(body)); } catch { return fail(400, 'JSON no válido.'); }
      if (!EVENT_TYPES.has(e.type)) return fail(400, 'Evento desconocido.');
      await save('events', { type: e.type, path: clean(e.path, 200), tool: clean(e.tool, 60) || null, q: e.type.startsWith('search') ? clean(e.q, 80).toLowerCase() : null, n: Number.isFinite(e.n) ? e.n : null, code: clean(e.code, 40) || null, ref: clean(e.ref, 100) || null, day: new Date().toISOString().slice(0, 10) }, env);
      return new Response(null, { status: 204 });
    }

    if (pathname === '/api/contact') {
      const wantsJson = (req.headers.get('accept') || '').includes('application/json');
      const reply = (status, msg) => (wantsJson ? (status < 300 ? json({ ok: true }) : fail(status, msg)) : new Response(null, { status: 303, headers: { location: status < 300 ? '/contacto/?enviado=1' : '/contacto/?error=1' } }));
      if (limited(`ct:${key}`, 5, 3600e3)) return reply(429, 'Has enviado varios mensajes seguidos. Espera un rato.');
      const body = await readBody(req, 20000); if (!body) return reply(413, 'El mensaje es demasiado largo.');
      const f = Object.fromEntries(new URLSearchParams(new TextDecoder().decode(body)));
      const age = Date.now() - Number(f.t || 0);
      if (f.web || (f.t && (age < 3000 || age > 86400e3))) return reply(200); // bot: respuesta neutra, no se guarda
      const nombre = clean(f.nombre, 100), email = clean(f.email, 200), mensaje = clean(f.mensaje, 5000), motivo = ['error', 'sugerencia', 'colaboracion', 'otro'].includes(f.motivo) ? f.motivo : 'otro';
      if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || mensaje.length < 10) return reply(400, 'Revisa el nombre, el correo y el mensaje (mínimo 10 caracteres).');
      if (f.acepto !== 'on') return reply(400, 'Debes aceptar la política de privacidad.');
      if ((mensaje.match(/https?:\/\//g) || []).length > 3) return reply(400, 'El mensaje contiene demasiados enlaces.');
      const row = { nombre, email, motivo, mensaje, created_at: new Date().toISOString() };
      await save('contact_messages', row, env);
      if (env.CONTACT_WEBHOOK_URL) fetch(env.CONTACT_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: `Nuevo mensaje (${motivo}) de ${nombre} <${email}>:\n${mensaje}` }) }).catch((e) => logError('contact webhook', e));
      return reply(200);
    }

    let m;
    if ((m = pathname.match(/^\/api\/ai\/([a-z0-9-]+)$/))) {
      if (limited(`ai:${key}`, Number(env.AI_HOURLY_LIMIT || 10), 3600e3)) return fail(429, 'Has alcanzado el límite de usos por hora. Vuelve a intentarlo más tarde.');
      if (limited('ai:global', Number(env.AI_DAILY_LIMIT || 500), 86400e3)) return fail(503, 'Hemos alcanzado el límite diario de uso de IA. Vuelve mañana.');
      const body = await readBody(req, 64000); if (!body) return fail(413, 'El texto es demasiado largo.');
      let input; try { input = JSON.parse(new TextDecoder().decode(body)); } catch { return fail(400, 'Petición no válida.'); }
      return await runAi(m[1], input, env);
    }

    if ((m = pathname.match(/^\/api\/process\/([a-z0-9-]+)$/))) {
      const p = processors[m[1]]; if (!p) return fail(404, 'Herramienta no encontrada.');
      if (limited(`pr:${key}`, 30, 3600e3)) return fail(429, 'Demasiadas peticiones. Espera unos minutos.');
      const maxMB = Math.min(p.maxMB, Number(env.MAX_UPLOAD_MB || 20));
      const data = await readBody(req, maxMB * 1048576); if (!data) return fail(413, `El archivo supera el máximo de ${maxMB} MB.`);
      if (!data.length) return fail(400, 'No se ha recibido ningún archivo.');
      const type = sniff(data); if (!p.accept.includes(type)) return fail(415, 'Formato de archivo no compatible.');
      // Procesado en memoria: el archivo nunca se escribe en disco, así que no queda nada que limpiar.
      const result = await Promise.race([p.run(data, { type, name: clean(req.headers.get('x-filename'), 200) || 'archivo' }), new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { status: 504 })), p.timeoutMs || 25000))]);
      return result instanceof Response ? result : json(result);
    }
    return fail(404, 'No encontrado.');
  } catch (e) {
    logError(pathname, e);
    if (e.status === 504) return fail(504, 'El procesamiento ha tardado demasiado.');
    return fail(500, 'Error interno. Inténtalo de nuevo en unos segundos.');
  }
}
