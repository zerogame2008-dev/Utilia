// Cargado en todas las páginas: buscador, favoritos, historial, filtros y analítica respetuosa.
import { search } from './search.js';

const SPRITE = new URL('../icons.svg', import.meta.url).href;
let indexP;
export const loadIndex = () => (indexP ||= fetch(new URL('../search-index.json', import.meta.url)).then((r) => r.json()).catch(() => []));

// ---------- Almacenamiento local (puede no estar disponible: modo privado, bloqueo) ----------
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento: la función simplemente no persiste */ } },
};
export const favs = () => store.get('u.fav', []);
export function pushRecent(slug) { const r = store.get('u.recent', []).filter((x) => x !== slug); r.unshift(slug); store.set('u.recent', r.slice(0, 12)); }

// ---------- Analítica: agregada, sin cookies, sin IP; se desactiva con GPC/DNT ----------
const optOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
export function track(type, data = {}) {
  if (optOut) return;
  const body = JSON.stringify({ type, path: location.pathname, ...data });
  try { if (!navigator.sendBeacon?.('/api/event', new Blob([body], { type: 'application/json' }))) fetch('/api/event', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {}); } catch { /* nunca romper la página por la analítica */ }
}
const ref = document.referrer && new URL(document.referrer).host !== location.host ? new URL(document.referrer).host : undefined;
track('pageview', { ref });

// ---------- Elementos ----------
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); e.append(...kids); return e; };
export const iconEl = (name, cls = '') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', `i ${cls}`); s.setAttribute('aria-hidden', 'true'); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', `${SPRITE}#${name}`); s.append(u); return s; };
const card = (t) => el('li', { class: 'card tool-card', 'data-slug': t.s }, el('a', { href: t.u }, el('span', { class: 'card-icon' }, iconEl(t.i)), el('span', { class: 'card-body' }, el('strong', {}, t.n), el('span', {}, t.d), el('small', {}, t.cn))));

// ---------- Buscador con sugerencias (patrón combobox ARIA) ----------
for (const form of document.querySelectorAll('[data-search]')) {
  const input = form.querySelector('input'); const list = form.querySelector('.suggest'); let items = [], active = -1, timer;
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
  const paint = () => { [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === active))); if (active >= 0) input.setAttribute('aria-activedescendant', list.children[active].id); };
  const render = async () => {
    const q = input.value.trim(); if (!q) return close();
    items = search(await loadIndex(), q, { limit: 8 }); list.replaceChildren(); active = -1;
    if (!items.length) list.append(el('li', { class: 's-empty', role: 'option', 'aria-disabled': 'true' }, 'Sin resultados. Prueba con otras palabras.'));
    items.forEach((t, i) => { const li = el('li', { role: 'option', id: `${input.id}-o${i}`, 'aria-selected': 'false' }, el('span', { class: 'card-icon' }, iconEl(t.i)), el('span', { class: 's-body' }, el('strong', {}, t.n), el('small', {}, `${t.cn} · ${t.d}`))); li.addEventListener('mousedown', (e) => { e.preventDefault(); go(t); }); list.append(li); });
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
    clearTimeout(timer); timer = setTimeout(() => track('search', { q: q.slice(0, 80), n: items.length }), 1200);
  };
  const go = (t) => { track('search_click', { q: input.value.trim().slice(0, 80), tool: t.s }); location.href = t.u; };
  input.addEventListener('input', render);
  input.addEventListener('focus', () => { loadIndex(); if (input.value.trim()) render(); });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); active = (active + 1) % items.length; paint(); }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); active = (active - 1 + items.length) % items.length; paint(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); go(items[active]); }
    else if (e.key === 'Escape') { close(); }
  });
}
for (const a of document.querySelectorAll('[data-fill]')) a.addEventListener('click', (e) => { const input = document.querySelector('#q-hero'); if (!input) return; e.preventDefault(); input.value = a.dataset.fill; input.focus(); input.dispatchEvent(new Event('input')); });
// Atajo «/» para buscar
addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { const i = document.querySelector('#q-hero') || document.querySelector('#q-top'); if (i && i.offsetParent) { e.preventDefault(); i.focus(); } } });

// ---------- Filtro de listados (/herramientas/?q=…) ----------
const filter = document.querySelector('[data-filter]');
if (filter) {
  const root = document.querySelector(filter.dataset.filter); const cards = [...root.querySelectorAll('.tool-card')];
  const count = document.querySelector('[data-filter-count]'); const empty = document.querySelector('[data-filter-empty]');
  const apply = async () => {
    const q = filter.value.trim(); let ok = null;
    if (q) ok = new Set(search(await loadIndex(), q, { limit: 1000 }).map((t) => t.s));
    let shown = 0; for (const c of cards) { const vis = !ok || ok.has(c.dataset.slug); c.hidden = !vis; shown += vis; }
    for (const g of root.querySelectorAll('[data-filter-group]')) g.hidden = !g.querySelector('.tool-card:not([hidden])');
    count.textContent = q ? `${shown} resultado${shown === 1 ? '' : 's'}` : ''; empty.hidden = shown > 0;
  };
  const q = new URLSearchParams(location.search).get('q'); if (q) { filter.value = q; apply(); }
  filter.addEventListener('input', () => { apply(); const u = new URL(location.href); if (filter.value.trim()) u.searchParams.set('q', filter.value.trim()); else u.searchParams.delete('q'); history.replaceState(null, '', u); });
}

// ---------- Favoritos ----------
for (const b of document.querySelectorAll('[data-fav]')) {
  const sync = () => { const on = favs().includes(b.dataset.fav); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Quitar de favoritos' : 'Añadir a favoritos'); b.title = b.getAttribute('aria-label'); };
  b.addEventListener('click', () => { const f = favs(); const i = f.indexOf(b.dataset.fav); if (i >= 0) f.splice(i, 1); else f.unshift(b.dataset.fav); store.set('u.fav', f); sync(); track(i >= 0 ? 'unfav' : 'fav', { tool: b.dataset.fav }); });
  sync();
}

// ---------- Home: favoritos, recientes y recomendadas (solo en este navegador) ----------
const personal = document.querySelectorAll('[data-personal]');
if (personal.length) {
  const fav = favs(), recent = store.get('u.recent', []);
  if (fav.length || recent.length) loadIndex().then((idx) => {
    const by = Object.fromEntries(idx.map((t) => [t.s, t]));
    const seen = new Set([...fav, ...recent]);
    const rec = [...new Set(recent.flatMap((s) => by[s]?.r || []))].filter((s) => !seen.has(s)).slice(0, 4);
    const lists = { fav: fav.slice(0, 8), recent: recent.filter((s) => !fav.includes(s)).slice(0, 4), recommended: rec };
    for (const sec of personal) { const items = lists[sec.dataset.personal].map((s) => by[s]).filter(Boolean); if (items.length) { sec.querySelector('[data-list]').replaceChildren(...items.map(card)); sec.hidden = false; } }
  });
}
