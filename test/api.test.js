import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../api/router.js';
import { processors } from '../api/process.js';

const env = { ANALYTICS: 'on' }; // sin DATA_DIR ni Supabase: save() solo registra en consola
const req = (path, body, headers = {}) => new Request(`http://localhost${path}`, { method: 'POST', body, headers: { origin: 'http://localhost', 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json', ...headers } });
const form = (o) => new URLSearchParams(o).toString();
const ok = { nombre: 'Ana', email: 'ana@example.com', motivo: 'otro', mensaje: 'Hola, esto es una prueba.', acepto: 'on' };

test('contacto: valida, filtra bots y exige mismo origen', async (t) => {
  t.mock.method(console, 'log', () => {});
  const old = String(Date.now() - 10000);
  assert.equal((await handle(req('/api/contact', form({ ...ok, t: old })), { ip: '1.1.1.1', env })).status, 200);
  assert.equal((await handle(req('/api/contact', form({ ...ok, email: 'x', t: old })), { ip: '1.1.1.2', env })).status, 400);
  assert.equal((await handle(req('/api/contact', form({ ...ok, acepto: '', t: old })), { ip: '1.1.1.3', env })).status, 400);
  assert.equal((await handle(req('/api/contact', form({ ...ok, t: old }), { origin: 'https://malo.example' }), { ip: '1.1.1.4', env })).status, 403);
  // honeypot: respuesta neutra y no se guarda
  const logs = console.log.mock.calls.length;
  assert.equal((await handle(req('/api/contact', form({ ...ok, web: 'http://spam', t: old })), { ip: '1.1.1.5', env })).status, 200);
  assert.equal(console.log.mock.calls.length, logs);
  // sin JS: redirección 303
  const r = await handle(req('/api/contact', form({ ...ok, t: old }), { accept: 'text/html' }), { ip: '1.1.1.6', env });
  assert.equal(r.status, 303); assert.equal(r.headers.get('location'), '/contacto/?enviado=1');
});

test('contacto: rate limit por IP', async (t) => {
  t.mock.method(console, 'log', () => {});
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await handle(req('/api/contact', form({ ...ok, t: String(Date.now() - 10000) })), { ip: '9.9.9.9', env })).status);
  assert.deepEqual(codes.slice(-2), [429, 429]);
});

test('eventos y métodos', async (t) => {
  t.mock.method(console, 'log', () => {});
  assert.equal((await handle(req('/api/event', JSON.stringify({ type: 'tool_use', tool: 'x' }), { 'content-type': 'application/json' }), { ip: '2.2.2.2', env })).status, 204);
  assert.equal((await handle(req('/api/event', JSON.stringify({ type: 'otro' })), { ip: '2.2.2.2', env })).status, 400);
  assert.equal((await handle(new Request('http://localhost/api/event'), { env })).status, 405);
  assert.equal((await handle(new Request('http://localhost/api/health'), { env })).status, 200);
});

test('IA sin configurar responde 503 sin exponer detalles', async () => {
  const r = await handle(req('/api/ai/resumir-texto', JSON.stringify({ texto: 'x'.repeat(300) }), { 'content-type': 'application/json' }), { ip: '3.3.3.3', env });
  assert.equal(r.status, 503); assert.match((await r.json()).error, /no están disponibles/);
});

test('tipos de cambio: normaliza, cachea y sirve el último si falla el proveedor', async (t) => {
  const { resetRatesCache } = await import('../api/rates.js'); resetRatesCache();
  const quotes = ['USD', 'GBP', 'MXN', 'ARS', 'COP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK'].map((q, i) => ({ date: '2026-09-24', base: 'EUR', quote: q, rate: 1 + i }));
  let calls = 0; const real = globalThis.fetch;
  t.after(() => { globalThis.fetch = real; resetRatesCache(); });
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify([...quotes, { quote: 'bad', rate: 'x' }])); };
  const get = () => handle(new Request('http://localhost/api/rates'), { ip: '5.5.5.5', env });
  const a = await (await get()).json();
  assert.equal(a.rates.EUR, 1); assert.equal(a.rates.USD, 1); assert.equal(a.rates.bad, undefined); assert.equal(a.date, '2026-09-24');
  await get(); assert.equal(calls, 1, 'segunda petición desde caché');
  t.mock.method(console, 'error', () => {});
  resetRatesCache(); globalThis.fetch = async () => new Response('', { status: 500 });
  assert.equal((await get()).status, 503);
});

test('pipeline de servidor: firma binaria, tamaño y timeout', async () => {
  processors.eco = { accept: ['application/pdf'], maxMB: 1, run: async (b, { name }) => ({ bytes: b.length, name }) };
  processors.lento = { accept: ['application/pdf'], maxMB: 1, timeoutMs: 50, run: () => new Promise(() => {}) };
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  const r = await handle(req('/api/process/eco', pdf, { 'content-type': 'application/octet-stream', 'x-filename': 'a.pdf' }), { ip: '4.4.4.4', env });
  assert.deepEqual(await r.json(), { bytes: 6, name: 'a.pdf' });
  assert.equal((await handle(req('/api/process/eco', new Uint8Array([1, 2, 3, 4])), { ip: '4.4.4.4', env })).status, 415);
  assert.equal((await handle(req('/api/process/eco', new Uint8Array(2 * 1048576)), { ip: '4.4.4.4', env })).status, 413);
  const t = await handle(req('/api/process/lento', pdf), { ip: '4.4.4.4', env: { ...env } });
  assert.equal(t.status, 504);
  delete processors.eco; delete processors.lento;
});
