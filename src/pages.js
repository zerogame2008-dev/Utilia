import { html, raw, esc } from './html.js';
import { site } from './site.js';
import { categoryBySlug } from './categories.js';
import { tools, toolBySlug, categoryList, inCategory, url } from './registry.js';
import { articles } from './articles.js';
import { planned } from './tools/ia.js';
import { layout, icon, searchBox, breadcrumbs, breadcrumbLd, adSlot, abs } from './layout.js';
import { UNITS, PAIRS, convert, fmt, unitSlug } from '../public/js/tools/units-data.js';

const TYPE = {
  client: ['device', 'En tu dispositivo', 'El archivo o texto se procesa en tu navegador y no se envía a ningún servidor.'],
  server: ['server', 'En nuestro servidor', 'Se envía cifrado a nuestro servidor, se procesa en memoria y se elimina al terminar. No se guarda.'],
  ai: ['sparkles', 'Usa IA', 'El contenido se envía a un proveedor de IA para generar el resultado. Revisa siempre la respuesta.'],
};
export const badge = (t) => html`<span class="badge badge-${t.type}" title="${TYPE[t.type][2]}">${icon(TYPE[t.type][0])}${TYPE[t.type][1]}</span>`;

export const toolCard = (t, { showCat = false } = {}) => html`<li class="card tool-card" data-slug="${t.slug}">
  <a href="${url.tool(t)}"><span class="card-icon">${icon(t.icon)}</span><span class="card-body"><strong>${t.name}</strong><span>${t.short}</span>${showCat ? html`<small>${categoryBySlug[t.category].name}</small>` : ''}</span></a>
  ${t.type === 'ai' ? html`<span class="mini-badge">IA</span>` : ''}
</li>`;
const grid = (list, opts) => html`<ul class="grid tools-grid">${list.map((t) => toolCard(t, opts))}</ul>`;

const faqBlock = (faq, title = 'Preguntas frecuentes') => (faq.length ? html`<section class="section faq" aria-labelledby="faq-h"><h2 id="faq-h">${title}</h2>${faq.map(([q, a]) => html`<details><summary>${q}</summary><p>${a}</p></details>`)}</section>` : '');
const faqLd = (faq) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

// Enlaces [[slug|texto]] en contenido editorial: se escapa primero y luego se reconocen.
export function rich(text) {
  return raw(esc(text).replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (m, slug, label) => {
    const t = toolBySlug[slug]; if (!t) throw new Error(`Enlace a herramienta inexistente: ${slug}`);
    return `<a href="${url.tool(t)}">${label || t.name}</a>`;
  }));
}

// ---------- Home ----------
export function home() {
  const byPop = [...tools].sort((a, b) => b.popularity - a.popularity);
  const newest = [...tools].sort((a, b) => b.created.localeCompare(a.created) || b.order - a.order).filter((t) => !byPop.slice(0, 8).includes(t)).slice(0, 4);
  const quick = tools.filter((t) => t.live).sort((a, b) => b.popularity - a.popularity).filter((t) => !byPop.slice(0, 8).includes(t)).slice(0, 8);
  const examples = [['Comprimir un PDF', 'comprimir pdf'], ['Convertir una imagen', 'convertir imagen'], ['Calcular IVA', 'iva'], ['Formatear JSON', 'json']];
  const body = html`
<section class="hero">
  <div class="wrap hero-in">
    <h1>Todas las herramientas que necesitas. <span>En un solo lugar.</span></h1>
    <p class="lead">${tools.length} herramientas gratuitas para PDF, imágenes, texto, cálculos y desarrollo. Sin instalar nada, sin registro y, en casi todas, sin que tus archivos salgan de tu dispositivo.</p>
    ${searchBox('q-hero', { big: true, placeholder: '¿Qué necesitas hacer?' })}
    <p class="examples">Por ejemplo: ${examples.map(([l, q]) => html`<a href="/herramientas/?q=${encodeURIComponent(q)}" data-fill="${q}">${l}…</a>`)}</p>
    <ul class="props">
      <li>${icon('device')}<span><strong>Privado</strong> Procesado en tu navegador</span></li>
      <li>${icon('zap')}<span><strong>Rápido</strong> Resultado en segundos</span></li>
      <li>${icon('lock')}<span><strong>Sin registro</strong> Gratis, sin cuentas</span></li>
    </ul>
  </div>
</section>
<div class="wrap">
  <section class="section" id="favoritos" data-personal="fav" hidden aria-labelledby="fav-h"><h2 id="fav-h">${icon('star')} Tus favoritos</h2><ul class="grid tools-grid" data-list></ul></section>
  <section class="section" id="recientes" data-personal="recent" hidden aria-labelledby="rec-h"><h2 id="rec-h">${icon('clock')} Usadas recientemente</h2><ul class="grid tools-grid" data-list></ul></section>
  <section class="section" aria-labelledby="pop-h"><div class="section-head"><h2 id="pop-h">Herramientas populares</h2><a href="/herramientas/">Ver todas ${icon('chevron')}</a></div>${grid(byPop.slice(0, 8), { showCat: true })}</section>
  <section class="section" aria-labelledby="cat-h"><h2 id="cat-h">Categorías</h2>
    <ul class="grid cat-grid">${categoryList.map((c) => html`<li class="card cat-card"><a href="${url.category(c)}"><span class="card-icon">${icon(c.icon)}</span><strong>${c.name}</strong><span>${c.tools.length ? `${c.tools.length} herramientas` : 'Próximamente'}</span></a></li>`)}</ul>
  </section>
  <section class="section" id="recomendadas" data-personal="recommended" hidden aria-labelledby="recom-h"><h2 id="recom-h">Recomendadas para ti</h2><ul class="grid tools-grid" data-list></ul></section>
  <section class="section" aria-labelledby="quick-h"><h2 id="quick-h">${icon('zap')} Herramientas rápidas</h2><p class="section-sub">Resultado instantáneo mientras escribes.</p>${grid(quick, { showCat: true })}</section>
  <section class="section" aria-labelledby="new-h"><h2 id="new-h">Nuevas herramientas</h2>${grid(newest, { showCat: true })}</section>
  ${adSlot('home')}
  <section class="section" aria-labelledby="guides-h"><div class="section-head"><h2 id="guides-h">Guías</h2><a href="/guias/">Ver guías ${icon('chevron')}</a></div>
    <ul class="grid guide-grid">${articles.slice(0, 4).map((a) => html`<li class="card"><a href="${url.article(a)}"><span class="card-icon">${icon('book')}</span><span class="card-body"><strong>${a.title}</strong><span>${a.description}</span></span></a></li>`)}</ul>
  </section>
</div>`;
  return layout({
    title: `${site.name}: herramientas online gratis para PDF, imágenes y más`, description: site.description, path: '/', body, bodyClass: 'home',
    ld: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: abs('/'), inLanguage: 'es', potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: abs('/herramientas/?q={search_term_string}') }, 'query-input': 'required name=search_term_string' } },
      { '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: abs('/'), logo: abs('/icon-512.png') },
    ],
  });
}

// ---------- Todas ----------
export function allTools() {
  const body = html`<div class="wrap page">
  ${breadcrumbs([['Inicio', '/'], ['Herramientas', '/herramientas/']])}
  <header class="page-head"><h1>Todas las herramientas</h1><p class="lead">${tools.length} herramientas gratuitas organizadas por categoría. Escribe para filtrar.</p></header>
  <div class="filter-bar"><label class="sr-only" for="filter">Filtrar herramientas</label><input id="filter" class="input" type="search" placeholder="Filtrar: pdf, imagen, iva, json…" data-filter="#all-tools" autocomplete="off"><span class="filter-count" data-filter-count aria-live="polite"></span></div>
  <div id="all-tools">
  ${categoryList.filter((c) => c.tools.length).map((c) => html`<section class="section" data-filter-group aria-labelledby="h-${c.slug}"><div class="section-head"><h2 id="h-${c.slug}">${icon(c.icon)} ${c.name}</h2><a href="${url.category(c)}">Ver categoría ${icon('chevron')}</a></div>${grid(c.tools.filter((t) => t.category === c.slug))}</section>`)}
  </div>
  <p class="empty-state" data-filter-empty hidden>No hay herramientas que coincidan. Prueba con otra palabra o <a href="/contacto/">sugiérenos una</a>.</p>
</div>`;
  return layout({ title: 'Todas las herramientas online gratis', description: `Listado completo de las ${tools.length} herramientas online gratuitas de ${site.name}: PDF, imágenes, texto, conversores, calculadoras, desarrollo y SEO.`, path: '/herramientas/', body, ld: [breadcrumbLd([['Inicio', '/'], ['Herramientas', '/herramientas/']])] });
}

// ---------- Categoría ----------
export function category(c) {
  const list = inCategory(c.slug);
  const crumbs = [['Inicio', '/'], ['Herramientas', '/herramientas/'], [c.name, url.category(c)]];
  const guides = articles.filter((a) => a.tools.some((s) => list.some((t) => t.slug === s)));
  const others = categoryList.filter((o) => o.slug !== c.slug && o.tools.length);
  const body = html`<div class="wrap page">
  ${breadcrumbs(crumbs)}
  <header class="page-head"><span class="page-icon">${icon(c.icon)}</span><h1>${c.title}</h1><p class="lead">${c.description}</p></header>
  ${list.length ? html`
  <div class="filter-bar"><label class="sr-only" for="filter">Filtrar en ${c.name}</label><input id="filter" class="input" type="search" placeholder="Filtrar en ${c.name}…" data-filter="#cat-tools" autocomplete="off"><span class="filter-count" data-filter-count aria-live="polite"></span></div>
  <div id="cat-tools"><section data-filter-group aria-label="Herramientas de ${c.name}">${grid(list)}</section></div>
  <p class="empty-state" data-filter-empty hidden>Ninguna herramienta coincide con el filtro.</p>` : html`
  <section class="section soon"><h2>Próximamente</h2><p>Estamos preparando estas herramientas. Se identificarán siempre con la etiqueta <strong>IA</strong> y te indicaremos qué datos se envían antes de usarlas.</p><ul class="soon-list">${(c.slug === 'ia' ? planned : []).map((p) => html`<li>${icon('sparkles')} ${p}</li>`)}</ul></section>`}
  ${adSlot('category')}
  ${faqBlock(c.faq)}
  ${guides.length ? html`<section class="section"><h2>Guías relacionadas</h2><ul class="link-list">${guides.map((a) => html`<li><a href="${url.article(a)}">${a.title}</a></li>`)}</ul></section>` : ''}
  <section class="section"><h2>Otras categorías</h2><ul class="chips">${others.map((o) => html`<li><a class="chip" href="${url.category(o)}">${icon(o.icon)} ${o.name}</a></li>`)}</ul></section>
</div>`;
  return layout({ title: c.seoTitle, description: c.description, path: url.category(c), body, noindex: !list.length, ld: [breadcrumbLd(crumbs), ...(c.faq.length && list.length ? [faqLd(c.faq)] : [])] });
}

// ---------- Campos del formulario ----------
const showIfOk = (cond, fields) => {
  if (!cond) return true; const [, k, op, v] = cond.match(/^(\w+)(!?=)(.+)$/);
  const cur = String(fields.find((f) => f.name === k)?.value ?? ''); return op === '=' ? cur === v : cur !== v;
};
function field(f, t) {
  const id = `f-${f.name}`; const help = f.help ? html`<p class="help" id="${id}-help">${f.help}</p>` : '';
  const aria = f.help ? raw(` aria-describedby="${id}-help"`) : '';
  const wrap = (inner, cls = '') => html`<div class="field ${f.half ? 'half' : ''} ${cls}"${f.showIf ? raw(` data-show-if="${esc(f.showIf)}"`) : ''}${showIfOk(f.showIf, t.fields) ? '' : raw(' hidden')}>${inner}${help}</div>`;
  const label = html`<label for="${id}">${f.label}${f.counter ? html` <span class="counter" data-counter-for="${id}" data-max="${f.counter}">0 / ${f.counter}</span>` : ''}</label>`;
  const val = f.value === 'today' || f.value === 'now' ? '' : f.value ?? '';
  const dyn = f.value === 'today' ? raw(' data-today') : f.value === 'now' ? raw(' data-now') : '';
  switch (f.type) {
    case 'textarea': return wrap(html`${label}<textarea id="${id}" name="${f.name}" rows="${f.rows || 6}" class="input${f.mono ? ' mono' : ''}" placeholder="${f.placeholder || ''}" spellcheck="${f.mono ? 'false' : 'true'}"${f.maxLength ? raw(` maxlength="${f.maxLength}"`) : ''}${aria}>${val}</textarea>`, 'wide');
    case 'select': return wrap(html`${label}<select id="${id}" name="${f.name}" class="input"${aria}>${f.options.map(([v, l]) => html`<option value="${v}"${String(f.value) === String(v) ? raw(' selected') : ''}>${l}</option>`)}</select>`);
    case 'checkbox': return wrap(html`<label class="check"><input type="checkbox" id="${id}" name="${f.name}"${f.value ? raw(' checked') : ''}${aria}><span>${f.label}</span></label>`, 'field-check');
    case 'range': return wrap(html`<label for="${id}">${f.label} <output for="${id}" data-range-out="${id}">${val}${f.suffix || ''}</output></label><input type="range" id="${id}" name="${f.name}" min="${f.min}" max="${f.max}" step="${f.step || 1}" value="${val}" data-suffix="${f.suffix || ''}"${aria}>`);
    case 'color': return wrap(html`${label}<input type="color" id="${id}" name="${f.name}" value="${val}" class="input color"${f.syncWith ? raw(` data-sync="${esc(f.syncWith)}"`) : ''}${aria}>`);
    case 'file': {
      const exts = f.accept.split(',').map((m) => ({ 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP', 'image/gif': 'GIF', 'image/bmp': 'BMP', 'image/svg+xml': 'SVG', 'application/pdf': 'PDF' })[m.trim()] || m).join(', ');
      return wrap(html`<div class="drop" data-drop data-max-mb="${f.maxMB}" data-max-files="${f.maxFiles || (f.multiple ? 50 : 1)}"${f.sortable ? raw(' data-sortable') : ''}>
        <input type="file" id="${id}" name="${f.name}" accept="${f.accept}"${f.multiple ? raw(' multiple') : ''} class="drop-input" aria-describedby="${id}-hint">
        <label for="${id}" class="drop-label">${icon('upload', 'drop-i')}<span class="drop-title">${f.multiple ? 'Arrastra tus archivos aquí' : 'Arrastra tu archivo aquí'} <span class="drop-or">o</span> <span class="link">elígelos</span></span><span class="drop-hint" id="${id}-hint">${exts} · hasta ${f.maxMB} MB${f.multiple ? ` · máx. ${f.maxFiles || 50} archivos` : ''}</span></label>
      </div><ol class="file-list" data-files hidden aria-label="Archivos seleccionados"></ol>`, 'wide');
    }
    default: return wrap(html`${label}<input type="${f.type}" id="${id}" name="${f.name}" class="input${f.mono ? ' mono' : ''}" value="${val}"${f.placeholder ? raw(` placeholder="${esc(f.placeholder)}"`) : ''}${f.min != null ? raw(` min="${f.min}"`) : ''}${f.max != null ? raw(` max="${f.max}"`) : ''}${f.step ? raw(` step="${f.step}"`) : ''}${f.type === 'number' ? raw(' inputmode="decimal"') : f.inputmode ? raw(` inputmode="${f.inputmode}"`) : ''}${f.type === 'text' ? raw(' autocomplete="off" spellcheck="false"') : ''}${dyn}${aria}>`);
  }
}

export function toolWidget(t, { fieldsOverride } = {}) {
  const fields = fieldsOverride || t.fields;
  const tt = { ...t, fields };
  return html`<form class="tool" id="tool" data-slug="${t.slug}" data-family="${t.family}" data-type="${t.type}"${t.live ? raw(' data-live') : ''}${t.options ? raw(` data-options="${esc(JSON.stringify(t.options))}"`) : ''} novalidate>
    <div class="fields">${fields.map((f) => field(f, tt))}</div>
    <div class="actions">
      ${!t.live ? html`<button class="btn btn-primary" type="submit" data-run>${icon(t.type === 'ai' ? 'sparkles' : 'zap')}<span>${t.submit || 'Calcular'}</span></button>` : ''}
      ${t.regenerate ? html`<button class="btn" type="button" data-regenerate>${icon('reset')}<span>Generar otros</span></button>` : ''}
      ${t.swap ? html`<button class="btn" type="button" data-swap="${t.swap.join(',')}">${icon('swap')}<span>Intercambiar</span></button>` : ''}
      <button class="btn btn-ghost" type="reset" data-reset>${icon('x')}<span>Limpiar</span></button>
      <button class="btn btn-ghost" type="button" data-cancel hidden>${icon('x')}<span>Cancelar</span></button>
    </div>
    <div class="progress" data-progress hidden><div class="progress-bar"><span></span></div><p class="progress-label" aria-live="polite"></p></div>
    <div class="output" id="output" aria-live="polite" aria-atomic="false"><p class="output-empty">${t.live ? 'El resultado aparecerá aquí mientras escribes.' : 'El resultado aparecerá aquí.'}</p></div>
    <noscript><p class="notice">Esta herramienta necesita JavaScript para funcionar en tu navegador.</p></noscript>
  </form>`;
}

function facts(t) {
  const out = [];
  if (t.type === 'client') out.push(['device', 'Sin subir nada: funciona en tu navegador']);
  if (t.live) out.push(['zap', 'Resultado instantáneo mientras escribes']);
  const f = t.fields.find((x) => x.type === 'file');
  if (f?.multiple) out.push(['grid', `Varios archivos a la vez (hasta ${f.maxFiles || 50})`]);
  if (f) out.push(['file', `Archivos de hasta ${f.maxMB} MB`]);
  out.push(['lock', 'Gratis, sin registro y sin marcas de agua']);
  return out;
}

// ---------- Herramienta ----------
export function tool(t) {
  const c = categoryBySlug[t.category];
  const crumbs = [['Inicio', '/'], ['Herramientas', '/herramientas/'], [c.name, url.category(c)], [t.name, url.tool(t)]];
  const more = inCategory(t.category).filter((o) => o.slug !== t.slug && !t.relatedTools.includes(o)).slice(0, 8);
  const guides = articles.filter((a) => a.tools.includes(t.slug));
  const body = html`<div class="wrap page tool-page">
  ${breadcrumbs(crumbs)}
  <header class="tool-head">
    <span class="page-icon">${icon(t.icon)}</span>
    <div class="tool-title"><h1>${t.name}</h1><p class="lead">${t.short}</p></div>
    <div class="tool-meta">${badge(t)}<button class="icon-btn fav-btn" type="button" data-fav="${t.slug}" aria-pressed="false" aria-label="Añadir a favoritos" title="Añadir a favoritos">${icon('star')}</button></div>
  </header>
  ${toolWidget(t)}
  <p class="privacy-note">${icon(TYPE[t.type][0])} ${TYPE[t.type][2]}</p>
  ${adSlot('tool')}
  <div class="content-grid">
    <div class="content">
      <section class="section howto"><h2>${t.howto.title}</h2><ol class="steps">${t.howto.steps.map((s) => html`<li>${s}</li>`)}</ol></section>
      ${t.about.length ? html`<section class="section prose"><h2>Lo que debes saber</h2>${t.about.map((p) => html`<p>${rich(p)}</p>`)}</section>` : ''}
      ${faqBlock(t.faq)}
    </div>
    <aside class="side">
      <section class="side-box"><h2>Características</h2><ul class="facts">${facts(t).map(([i, s]) => html`<li>${icon(i)}<span>${s}</span></li>`)}</ul></section>
      ${guides.length ? html`<section class="side-box"><h2>Guías</h2><ul class="link-list">${guides.map((a) => html`<li><a href="${url.article(a)}">${a.title}</a></li>`)}</ul></section>` : ''}
    </aside>
  </div>
  ${t.relatedTools.length ? html`<section class="section"><h2>Herramientas relacionadas</h2>${grid(t.relatedTools, { showCat: true })}</section>` : ''}
  ${more.length ? html`<section class="section"><div class="section-head"><h2>Más herramientas de ${c.name}</h2><a href="${url.category(c)}">Ver todas ${icon('chevron')}</a></div><ul class="chips">${more.map((o) => html`<li><a class="chip" href="${url.tool(o)}">${icon(o.icon)} ${o.name}</a></li>`)}</ul></section>` : ''}
</div>`;
  return layout({
    title: t.seoTitle, description: t.description, path: url.tool(t), body, scripts: ['js/tool.js'],
    ld: [
      breadcrumbLd(crumbs),
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: t.name, description: t.description, url: abs(url.tool(t)), applicationCategory: t.category === 'desarrollo' ? 'DeveloperApplication' : 'UtilitiesApplication', operatingSystem: 'Web', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, inLanguage: 'es', dateModified: t.updated },
      ...(t.faq.length ? [faqLd(t.faq)] : []),
    ],
  });
}

// ---------- SEO programático: /conversor/<a>-a-<b> ----------
export const pairPath = ([kind, a, b]) => `/conversor/${unitSlug(a)}-a-${unitSlug(b)}/`;
export function pairPage(pair) {
  const [kind, a, b] = pair; const t = toolBySlug[`conversor-${kind}`]; const u = UNITS[kind].units;
  const la = u[a][0].toLowerCase(), lb = u[b][0].toLowerCase(); const name = `${u[a][0]}s a ${lb}s`.replace(/ss\b/, 's');
  const title = `Convertir ${a} a ${b} (${la} a ${lb})`;
  const values = kind === 'temperatura' ? [-40, -10, 0, 10, 20, 25, 30, 37, 40, 100] : [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100, 1000];
  const factor = kind === 'temperatura' ? null : convert(kind, 1, a, b);
  const formula = kind === 'temperatura' ? { 'c-f': '°F = °C × 9/5 + 32', 'f-c': '°C = (°F − 32) × 5/9' }[`${a}-${b}`] : `1 ${a} = ${fmt(factor)} ${b}  ·  ${b} = ${a} × ${fmt(factor)}`;
  const crumbs = [['Inicio', '/'], ['Conversores', '/herramientas/conversores/'], [t.name, url.tool(t)], [title, pairPath(pair)]];
  const fields = t.fields.map((f) => (f.name === 'de' ? { ...f, value: a } : f.name === 'a' ? { ...f, value: b } : f));
  const reverse = PAIRS.find(([k, x, y]) => k === kind && x === b && y === a);
  const body = html`<div class="wrap page tool-page">
  ${breadcrumbs(crumbs)}
  <header class="tool-head"><span class="page-icon">${icon('ruler')}</span><div class="tool-title"><h1>${title}</h1><p class="lead">${formula}</p></div><div class="tool-meta">${badge(t)}</div></header>
  ${toolWidget(t, { fieldsOverride: fields })}
  <div class="content-grid"><div class="content">
    <section class="section"><h2>Tabla de conversión de ${la} a ${lb}</h2>
      <div class="table-wrap"><table class="table"><thead><tr><th scope="col">${u[a][0]} (${a})</th><th scope="col">${u[b][0]} (${b})</th></tr></thead><tbody>${values.map((v) => html`<tr><td>${fmt(v)}</td><td>${fmt(convert(kind, v, a, b))}</td></tr>`)}</tbody></table></div>
    </section>
    <section class="section prose"><h2>Cómo convertir ${la} a ${lb}</h2><p>${kind === 'temperatura' ? `Aplica la fórmula ${formula}.` : `Multiplica el valor en ${la} por ${fmt(factor)}. Por ejemplo, 10 ${a} = ${fmt(convert(kind, 10, a, b))} ${b}.`}</p>${t.about.map((p) => html`<p>${p}</p>`)}</section>
  </div><aside class="side"><section class="side-box"><h2>Conversiones relacionadas</h2><ul class="link-list">${reverse ? html`<li><a href="${pairPath(reverse)}">${reverse[1]} a ${reverse[2]}</a></li>` : ''}${PAIRS.filter((p) => p[0] === kind && p !== reverse && p !== pair).map((p) => html`<li><a href="${pairPath(p)}">${p[1]} a ${p[2]}</a></li>`)}<li><a href="${url.tool(t)}">${t.name} completo</a></li></ul></section></aside></div>
</div>`;
  return layout({ title: `${title}: conversor y tabla`, description: `Convierte ${la} a ${lb} al instante. ${kind === 'temperatura' ? formula : `1 ${a} = ${fmt(factor)} ${b}`}. Con tabla de equivalencias y fórmula.`.slice(0, 165), path: pairPath(pair), body, scripts: ['js/tool.js'], ld: [breadcrumbLd(crumbs)] });
}

// ---------- Guías ----------
export function guides() {
  const body = html`<div class="wrap page">${breadcrumbs([['Inicio', '/'], ['Guías', '/guias/']])}
  <header class="page-head"><span class="page-icon">${icon('book')}</span><h1>Guías</h1><p class="lead">Explicaciones breves y prácticas, cada una con la herramienta para hacerlo al momento.</p></header>
  <ul class="grid guide-grid">${articles.map((a) => html`<li class="card"><a href="${url.article(a)}"><span class="card-icon">${icon('book')}</span><span class="card-body"><strong>${a.title}</strong><span>${a.description}</span></span></a></li>`)}</ul></div>`;
  return layout({ title: 'Guías prácticas', description: 'Guías breves sobre PDF, formatos de imagen, IVA, JSON, Base64 y más, con la herramienta para hacerlo al momento.', path: '/guias/', body, ld: [breadcrumbLd([['Inicio', '/'], ['Guías', '/guias/']])] });
}

const block = ([type, v, rows]) => {
  switch (type) {
    case 'p': return html`<p>${rich(v)}</p>`;
    case 'h2': return html`<h2>${v}</h2>`;
    case 'ul': return html`<ul>${v.map((x) => html`<li>${rich(x)}</li>`)}</ul>`;
    case 'ol': return html`<ol>${v.map((x) => html`<li>${rich(x)}</li>`)}</ol>`;
    case 'table': return html`<div class="table-wrap"><table class="table"><thead><tr>${v.map((h) => html`<th scope="col">${h}</th>`)}</tr></thead><tbody>${rows.map((r) => html`<tr>${r.map((c, i) => (i ? html`<td>${c}</td>` : html`<th scope="row">${c}</th>`))}</tr>`)}</tbody></table></div>`;
    case 'cta': { const t = toolBySlug[v]; return html`<p class="cta"><a class="btn btn-primary btn-lg" href="${url.tool(t)}">${icon(t.icon)}<span>${t.name} ahora</span></a></p>`; }
    default: throw new Error(`Bloque desconocido: ${type}`);
  }
};
export function article(a) {
  const crumbs = [['Inicio', '/'], ['Guías', '/guias/'], [a.title, url.article(a)]];
  const rel = a.tools.map((s) => toolBySlug[s]).filter(Boolean);
  const body = html`<div class="wrap page">${breadcrumbs(crumbs)}
  <article class="article prose"><header><h1>${a.title}</h1><p class="lead">${a.description}</p><p class="meta">Actualizado el <time datetime="${a.date}">${new Date(a.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</time></p></header>${a.blocks.map(block)}</article>
  <section class="section"><h2>Herramientas de esta guía</h2>${grid(rel, { showCat: true })}</section></div>`;
  return layout({ title: a.title, description: a.description, path: url.article(a), body, ogType: 'article', ld: [breadcrumbLd(crumbs), { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.description, datePublished: a.date, dateModified: a.date, inLanguage: 'es', mainEntityOfPage: abs(url.article(a)), author: { '@type': 'Organization', name: site.name, url: abs('/') }, publisher: { '@type': 'Organization', name: site.name, logo: { '@type': 'ImageObject', url: abs('/icon-512.png') } }, image: abs('/og.png') }] });
}

// ---------- Legal, contacto, 404 ----------
const ph = (s) => (s.startsWith('[') ? html`<mark class="placeholder">${s}</mark>` : s);
function legalPage(path, title, description, sections) {
  const body = html`<div class="wrap page">${breadcrumbs([['Inicio', '/'], [title, path]])}<article class="article prose legal"><h1>${title}</h1><p class="meta">Última actualización: 24 de septiembre de 2026</p>${sections}</article></div>`;
  return layout({ title, description, path, body });
}
export const legal = {
  '/aviso-legal/': () => legalPage('/aviso-legal/', 'Aviso legal', `Información legal sobre el titular y las condiciones de acceso a ${site.name}.`, html`
    <h2>Titular del sitio web</h2><p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los datos del titular:</p>
    <ul><li>Titular: ${ph(site.owner)}</li><li>NIF/CIF: ${ph(site.ownerId)}</li><li>Domicilio: ${ph(site.ownerAddress)}</li><li>Correo electrónico: ${ph(site.email)}</li><li>Sitio web: ${site.url}</li></ul>
    <h2>Objeto</h2><p>${site.name} ofrece herramientas online gratuitas para realizar tareas con documentos, imágenes, texto, cálculos y código directamente desde el navegador.</p>
    <h2>Propiedad intelectual</h2><p>El diseño, el código y los textos del sitio pertenecen a su titular o se usan con licencia. Los archivos que procesas con las herramientas son tuyos: ${site.name} no adquiere ningún derecho sobre ellos. Las librerías de código abierto utilizadas conservan sus licencias (pdf-lib, MIT; PDF.js, Apache 2.0).</p>
    <h2>Responsabilidad</h2><p>Las herramientas se ofrecen «tal cual». Aunque se revisan con cuidado, los resultados de cálculos fiscales, financieros o de salud son orientativos y no sustituyen el consejo de un profesional. Conserva siempre una copia de tus archivos originales.</p>
    <h2>Legislación aplicable</h2><p>Este aviso se rige por la legislación española.</p>`),
  '/privacidad/': () => legalPage('/privacidad/', 'Política de privacidad', `Cómo trata ${site.name} tus datos y tus archivos: la mayoría de herramientas funcionan en tu navegador sin enviar nada.`, html`
    <h2>Resumen</h2><ul><li>La mayoría de herramientas funcionan en tu navegador: <strong>tus archivos y textos no se envían a ningún servidor</strong>.</li><li>No usamos cookies de seguimiento ni analítica de terceros.</li><li>Solo tratamos datos personales si nos escribes por el formulario de contacto.</li></ul>
    <h2>Responsable del tratamiento</h2><p>${ph(site.owner)} (${ph(site.ownerId)}), ${ph(site.ownerAddress)}. Contacto: ${ph(site.email)}.</p>
    <h2>Archivos que procesas</h2><p><strong>Herramientas «En tu dispositivo»:</strong> el procesamiento ocurre con JavaScript en tu navegador. El archivo nunca se transmite, por lo que no lo tratamos en ningún momento.</p>
    <p><strong>Herramientas «En nuestro servidor»</strong> (cuando existan, siempre señalizadas): el archivo se envía por HTTPS, se procesa en memoria y se descarta al terminar la petición. No se guarda en disco ni se usa para ningún otro fin.</p>
    <p><strong>Herramientas con IA</strong> (siempre señalizadas con la etiqueta IA): el texto se envía a un proveedor de IA (${ph('[PROVEEDOR DE IA, p. ej. OpenAI o Google]')}) únicamente para generar la respuesta, mediante su API, que no utiliza estos datos para entrenar modelos según sus condiciones. No almacenamos el contenido.</p>
    <h2>Tipos de cambio</h2><p>El conversor de monedas descarga la tabla de tipos del día desde nuestro propio servidor, que a su vez la obtiene de Frankfurter (frankfurter.dev), un servicio abierto de tipos de referencia de bancos centrales. Tu navegador no contacta con terceros y el importe que escribes no se envía.</p>
    <h2>Estadísticas de uso</h2><p>Medimos de forma agregada qué páginas y herramientas se usan, búsquedas internas y errores, para mejorar el servicio. No usamos cookies, no guardamos tu dirección IP ni creamos perfiles. Base jurídica: interés legítimo (art. 6.1.f RGPD). Si tu navegador envía la señal «Global Privacy Control» o «Do Not Track», no registramos nada.</p>
    <h2>Formulario de contacto</h2><p>Si nos escribes, tratamos tu nombre, correo y mensaje para responderte (base jurídica: tu consentimiento y la aplicación de medidas precontractuales). Los conservamos el tiempo necesario para atender tu consulta y, como máximo, 12 meses.</p>
    <h2>Encargados del tratamiento</h2><p>Proveedor de alojamiento: ${ph('[PROVEEDOR DE HOSTING]')}. Base de datos (si se activa): ${ph('[PROVEEDOR POSTGRESQL, p. ej. Supabase]')}. Proveedor de IA: ${ph('[PROVEEDOR DE IA]')}.</p>
    <h2>Tus derechos</h2><p>Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${ph(site.email)}. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
    <h2>Almacenamiento local</h2><p>Tus favoritos y las herramientas usadas recientemente se guardan solo en tu navegador (localStorage). Nunca se envían y puedes borrarlos desde la configuración de tu navegador.</p>`),
  '/cookies/': () => legalPage('/cookies/', 'Política de cookies', `${site.name} no usa cookies de seguimiento ni publicidad. Qué almacenamiento local utilizamos y para qué.`, html`
    <h2>¿Usamos cookies?</h2><p>No. ${site.name} no instala cookies propias ni de terceros con fines analíticos, publicitarios o de seguimiento. Por eso no te mostramos un banner de consentimiento.</p>
    <h2>Almacenamiento local técnico</h2><p>Guardamos en el <em>localStorage</em> de tu navegador, solo si usas esas funciones:</p>
    <div class="table-wrap"><table class="table"><thead><tr><th scope="col">Clave</th><th scope="col">Finalidad</th><th scope="col">Duración</th></tr></thead><tbody><tr><td>u.fav</td><td>Tus herramientas favoritas</td><td>Hasta que la borres</td></tr><tr><td>u.recent</td><td>Últimas herramientas usadas (solo su nombre, nunca tus archivos ni textos)</td><td>Hasta que la borres</td></tr></tbody></table></div>
    <p>Es almacenamiento estrictamente necesario para una función que solicitas, exento de consentimiento según el artículo 22.2 de la LSSI-CE.</p>
    <h2>Cambios futuros</h2><p>Si en el futuro se incorporan publicidad o herramientas de terceros que usen cookies, se pedirá tu consentimiento previo mediante un panel de configuración, con la opción de rechazarlas tan fácilmente como aceptarlas.</p>`),
  '/condiciones/': () => legalPage('/condiciones/', 'Condiciones de uso', `Condiciones de uso de las herramientas online de ${site.name}.`, html`
    <h2>Uso del servicio</h2><p>Puedes usar las herramientas de forma gratuita para fines personales y profesionales. No está permitido usarlas de forma automatizada masiva, intentar dañar el servicio ni procesar contenido ilícito o sobre el que no tengas derechos.</p>
    <h2>Tus archivos</h2><p>Eres responsable de los archivos que procesas y de tener derecho a hacerlo. En particular, las herramientas que modifican PDF no deben usarse para eludir protecciones de documentos ajenos.</p>
    <h2>Herramientas con IA</h2><p>Los resultados generados por IA pueden contener errores. Revísalos antes de usarlos en decisiones importantes.</p>
    <h2>Disponibilidad</h2><p>Hacemos lo posible por mantener el servicio disponible y correcto, pero no garantizamos que esté libre de errores ni interrupciones. Conserva siempre tus originales.</p>
    <h2>Contacto</h2><p>Para cualquier duda, usa el <a href="/contacto/">formulario de contacto</a>.</p>`),
};

export function contact() {
  const body = html`<div class="wrap page narrow">${breadcrumbs([['Inicio', '/'], ['Contacto', '/contacto/']])}
  <header class="page-head"><span class="page-icon">${icon('mail')}</span><h1>Contacto</h1><p class="lead">¿Has encontrado un error, echas en falta una herramienta o quieres colaborar? Escríbenos.</p></header>
  <form class="card form" method="post" action="/api/contact" data-contact novalidate>
    <div class="fields">
      <div class="field half"><label for="c-nombre">Nombre</label><input class="input" id="c-nombre" name="nombre" autocomplete="name" required maxlength="100"></div>
      <div class="field half"><label for="c-email">Correo electrónico</label><input class="input" id="c-email" name="email" type="email" autocomplete="email" required maxlength="200"></div>
      <div class="field wide"><label for="c-motivo">Motivo</label><select class="input" id="c-motivo" name="motivo"><option value="error">He encontrado un error</option><option value="sugerencia">Sugerir una herramienta</option><option value="colaboracion">Colaboración o publicidad</option><option value="otro">Otro</option></select></div>
      <div class="field wide"><label for="c-mensaje">Mensaje</label><textarea class="input" id="c-mensaje" name="mensaje" rows="6" required minlength="10" maxlength="5000"></textarea></div>
      <div class="hp" aria-hidden="true"><label for="c-web">No rellenes este campo</label><input id="c-web" name="web" tabindex="-1" autocomplete="off"></div>
      <input type="hidden" name="t" value="" data-ts>
      <div class="field wide field-check"><label class="check"><input type="checkbox" name="acepto" required><span>He leído la <a href="/privacidad/">política de privacidad</a> y acepto que se usen mis datos para responderme.</span></label></div>
    </div>
    <div class="actions"><button class="btn btn-primary" type="submit">${icon('mail')}<span>Enviar mensaje</span></button></div>
    <div class="form-status" data-status role="status" aria-live="polite"></div>
  </form>
  <p class="muted">También puedes escribirnos a ${ph(site.email)}.</p></div>`;
  return layout({ title: 'Contacto', description: `Contacta con ${site.name}: informa de errores, sugiere herramientas o propón colaboraciones.`, path: '/contacto/', body, scripts: ['js/contact.js'] });
}

export function notFound() {
  const top = [...tools].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
  const body = html`<div class="wrap page narrow center"><p class="big-code" aria-hidden="true">404</p><h1>No encontramos esta página</h1><p class="lead">Puede que la dirección haya cambiado. Busca la herramienta que necesitas:</p>${searchBox('q-404', { big: true, placeholder: '¿Qué necesitas hacer?' })}<section class="section"><h2>Herramientas populares</h2>${grid(top)}</section></div>`;
  return layout({ title: 'Página no encontrada', description: 'La página que buscas no existe.', path: '/404.html', body, noindex: true });
}

export function errorPage() {
  const body = html`<div class="wrap page narrow center"><p class="big-code" aria-hidden="true">500</p><h1>Algo ha fallado</h1><p class="lead">Ha ocurrido un error en el servidor. Vuelve a intentarlo en unos segundos.</p><p><a class="btn btn-primary" href="/">Volver al inicio</a></p></div>`;
  return layout({ title: 'Error del servidor', description: 'Error del servidor.', path: '/500.html', body, noindex: true });
}
