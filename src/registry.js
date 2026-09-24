// Registro único de herramientas: añadir una herramienta = añadir su objeto en src/tools/<categoría>.js
// y su función en public/js/tools/<family>.js. Todo lo demás (páginas, SEO, buscador, sitemap) sale de aquí.
import { categories, categoryBySlug } from './categories.js';
import pdf from './tools/pdf.js';
import imagenes from './tools/imagenes.js';
import texto from './tools/texto.js';
import conversores from './tools/conversores.js';
import calculadoras from './tools/calculadoras.js';
import desarrollo from './tools/desarrollo.js';
import seo from './tools/seo.js';
import ia from './tools/ia.js';

export const STATUSES = ['draft', 'review', 'published', 'update', 'archived'];
export const LIVE = new Set(['published', 'update']); // «update» = publicada, pendiente de revisar contenido
const DEFAULT_DATE = '2026-09-24';

const byCategory = { pdf, imagenes, texto, conversores, calculadoras, desarrollo, seo, ia };

const all = Object.entries(byCategory).flatMap(([category, list], ci) => list.map((t, i) => ({
  type: 'client', status: 'published', created: DEFAULT_DATE, updated: DEFAULT_DATE, popularity: 10, also: [], keywords: [], faq: [], about: [], related: [], live: false,
  ...Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined)), category, order: ci * 1000 + i,
})));

// Validación en build: un error aquí rompe el build en vez de publicar una página rota.
const seen = new Set();
for (const t of all) {
  const where = `herramienta «${t.slug}»`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug)) throw new Error(`${where}: slug no válido`);
  if (seen.has(t.slug)) throw new Error(`${where}: slug duplicado`); seen.add(t.slug);
  for (const k of ['name', 'family', 'short', 'seoTitle', 'description', 'fields', 'howto']) if (!t[k]) throw new Error(`${where}: falta «${k}»`);
  if (!STATUSES.includes(t.status)) throw new Error(`${where}: estado «${t.status}» desconocido`);
  if (!['client', 'server', 'ai'].includes(t.type)) throw new Error(`${where}: tipo «${t.type}» desconocido`);
  if (t.description.length > 170) throw new Error(`${where}: description de ${t.description.length} caracteres (máx. 170)`);
  for (const c of t.also) if (!categoryBySlug[c]) throw new Error(`${where}: categoría secundaria «${c}» no existe`);
  for (const f of t.fields) if (!f.name || !f.type) throw new Error(`${where}: campo sin name/type`);
}

export const tools = all.filter((t) => LIVE.has(t.status));
export const toolBySlug = Object.fromEntries(tools.map((t) => [t.slug, t]));
export const allTools = all; // incluye borradores: para el futuro panel de administración

export const url = {
  tool: (t) => `/herramientas/${t.category}/${t.slug}/`,
  category: (c) => `/herramientas/${c.slug || c}/`,
  article: (a) => `/guias/${a.slug}/`,
};

export const inCategory = (slug) => tools.filter((t) => t.category === slug || t.also.includes(slug)).sort((a, b) => b.popularity - a.popularity || a.order - b.order);

// Relacionadas: primero las elegidas a mano, luego completa con la misma categoría por afinidad de palabras clave.
const words = (t) => new Set([...t.keywords, t.name].join(' ').toLowerCase().split(/\W+/).filter((w) => w.length > 2));
for (const t of tools) {
  const picked = t.related.filter((s) => toolBySlug[s] && s !== t.slug);
  const mine = words(t);
  const fill = inCategory(t.category).filter((o) => o.slug !== t.slug && !picked.includes(o.slug))
    .map((o) => [o, [...words(o)].filter((w) => mine.has(w)).length * 10 + o.popularity / 10]).sort((a, b) => b[1] - a[1]).map(([o]) => o.slug);
  t.relatedTools = [...picked, ...fill].slice(0, 6).map((s) => toolBySlug[s]);
  t.missingRelated = t.related.filter((s) => !toolBySlug[s]);
}

export const categoryList = categories.map((c) => ({ ...c, tools: inCategory(c.slug) }));

export const searchIndex = tools.map((t) => ({
  s: t.slug, n: t.name, u: url.tool(t), c: t.category, cn: categoryBySlug[t.category].name, d: t.short, k: t.keywords.join(' | '), i: t.icon, p: t.popularity, t: t.type, r: t.relatedTools.slice(0, 3).map((x) => x.slug),
}));
