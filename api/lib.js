// Utilidades del backend. Sin dependencias: Request/Response/fetch estándar (Node 22 y Netlify Functions).
import { appendFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
export const fail = (status, error) => json({ error }, status);

// Rate limit en memoria por ventana fija. Techo: por proceso/instancia; con varias instancias usar Redis/Upstash.
const buckets = new Map();
export function limited(key, max, windowMs) {
  const now = Date.now(); const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key, { n: 1, reset: now + windowMs }); if (buckets.size > 50000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k); return false; }
  return ++b.n > max;
}
// La IP solo se usa, hasheada con sal diaria, como clave de rate limit. Nunca se guarda.
export const ipKey = (ip) => createHash('sha256').update(`${ip}|${new Date().toISOString().slice(0, 10)}|${process.env.RATE_SALT || 'utilia'}`).digest('hex').slice(0, 16);

// CSRF: los POST del navegador deben venir de nuestro propio origen.
export function sameOrigin(req, env) {
  const origin = req.headers.get('origin'); if (!origin) return !req.headers.get('sec-fetch-site') || req.headers.get('sec-fetch-site') === 'same-origin';
  try { const o = new URL(origin).host; return o === new URL(req.url).host || (env.SITE_URL && o === new URL(env.SITE_URL).host); } catch { return false; }
}

export async function readBody(req, maxBytes) {
  const len = Number(req.headers.get('content-length') || 0); if (len > maxBytes) return null;
  const reader = req.body?.getReader(); if (!reader) return new Uint8Array();
  const chunks = []; let size = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) { reader.cancel(); return null; } chunks.push(value); }
  const out = new Uint8Array(size); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out;
}

export const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

// Persistencia: PostgreSQL vía la API REST de Supabase (PostgREST) si está configurado; si no, JSONL local; si no hay disco, log.
export async function save(table, row, env = process.env) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify(row) });
    if (!res.ok) throw new Error(`Supabase ${table}: HTTP ${res.status}`);
    return;
  }
  if (env.DATA_DIR) { await mkdir(env.DATA_DIR, { recursive: true }); await appendFile(join(env.DATA_DIR, `${table}.jsonl`), JSON.stringify(row) + '\n'); return; }
  console.log(`[${table}]`, JSON.stringify(row));
}

// Logs sin datos sensibles: solo ruta, código y mensaje.
export const logError = (where, err) => console.error(`[error] ${where}: ${String(err?.message || err).slice(0, 300)}`);
