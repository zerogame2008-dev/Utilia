import { html, raw, jsonLd } from './html.js';
import { site } from './site.js';
import { categoryList } from './registry.js';

let A = '/a/dev'; // prefijo de assets versionado por hash de contenido
export const setAssetBase = (base) => { A = base; };
export const asset = (p) => `${A}/${p}`;
export const icon = (name, cls = '') => html`<svg class="i ${cls}" aria-hidden="true" focusable="false"><use href="${asset('icons.svg')}#${name}"/></svg>`;
export const abs = (path) => site.url + path;

export const logo = () => raw(`<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" class="lm-bg"/><rect x="8" y="8" width="7" height="7" rx="2" class="lm-a"/><rect x="17" y="8" width="7" height="7" rx="2" class="lm-b"/><rect x="8" y="17" width="7" height="7" rx="2" class="lm-b"/><rect x="17" y="17" width="7" height="7" rx="3.5" class="lm-b"/></svg>`);

export function searchBox(id, { big = false, placeholder = 'Buscar herramienta…' } = {}) {
  return html`<form class="search${big ? ' search-big' : ''}" role="search" action="/herramientas/" method="get" data-search>
    <label class="sr-only" for="${id}">Buscar herramientas</label>
    ${icon('search', 'search-i')}
    <input id="${id}" name="q" type="search" placeholder="${placeholder}" autocomplete="off" spellcheck="false" enterkeyhint="search" role="combobox" aria-expanded="false" aria-controls="${id}-list" aria-autocomplete="list">
    ${big ? html`<button class="btn btn-primary search-go" type="submit">Buscar</button>` : ''}
    <ul class="suggest" id="${id}-list" role="listbox" aria-label="Sugerencias" hidden></ul>
  </form>`;
}

const navCats = () => categoryList.filter((c) => c.tools.length);

export function breadcrumbs(items) {
  return html`<nav class="crumbs" aria-label="Migas de pan"><ol>${items.map(([name, path], i) => html`<li>${i < items.length - 1 ? html`<a href="${path}">${name}</a>${icon('chevron')}` : html`<span aria-current="page">${name}</span>`}</li>`)}</ol></nav>`;
}
export const breadcrumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })) });

export function adSlot(name) {
  return site.ads ? html`<aside class="ad" data-ad-slot="${name}" aria-label="Publicidad"><span class="ad-label">Publicidad</span></aside>` : '';
}

export function layout({ title, description, path, body, ld = [], noindex = false, scripts = [], ogType = 'website', bodyClass = '' }) {
  const fullTitle = title.includes(site.name) ? title : `${title} | ${site.name}`;
  const canonical = abs(path);
  return '<!doctype html>\n' + html`<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
${noindex ? raw('<meta name="robots" content="noindex, follow">') : ''}
<meta name="theme-color" content="#0b0d12" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f7f8fa" media="(prefers-color-scheme: light)">
<meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="${asset('css/app.css')}">
<link rel="modulepreload" href="${asset('js/core.js')}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="${site.locale}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${abs('/og.png')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${site.name}: ${site.tagline}">
<meta name="twitter:card" content="summary_large_image">
${ld.map(jsonLd)}
<script type="module" src="${asset('js/core.js')}"></script>
${scripts.map((s) => html`<script type="module" src="${asset(s)}"></script>`)}
${site.gaId ? html`<script type="module" src="${asset('js/consent.js')}"></script>` : ''}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Saltar al contenido</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="logo" href="/" aria-label="${site.name}, inicio">${logo()}<span>${site.name}</span></a>
    ${searchBox('q-top')}
    <nav class="nav" aria-label="Categorías">
      ${navCats().slice(0, 5).map((c) => html`<a href="/herramientas/${c.slug}/"${path.startsWith(`/herramientas/${c.slug}/`) ? raw(' aria-current="true"') : ''}>${c.name}</a>`)}
      <a href="/herramientas/"${path === '/herramientas/' ? raw(' aria-current="page"') : ''}>Todas</a>
    </nav>
    <button class="icon-btn menu-btn" type="button" popovertarget="mnav" aria-label="Abrir menú">${icon('menu')}</button>
  </div>
</header>
<div id="mnav" class="mnav" popover>
  <div class="mnav-head"><strong>Categorías</strong><button class="icon-btn" type="button" popovertarget="mnav" popovertargetaction="hide" aria-label="Cerrar menú">${icon('x')}</button></div>
  <nav aria-label="Categorías (móvil)">
    ${navCats().map((c) => html`<a href="/herramientas/${c.slug}/">${icon(c.icon)}<span>${c.name}</span><small>${c.tools.length}</small></a>`)}
    <a href="/herramientas/">${icon('grid')}<span>Todas las herramientas</span></a>
    <a href="/guias/">${icon('book')}<span>Guías</span></a>
  </nav>
</div>
<main id="main" tabindex="-1">
${body}
</main>
<footer class="site-footer">
  <div class="wrap foot">
    <div class="foot-brand">
      <a class="logo" href="/">${logo()}<span>${site.name}</span></a>
      <p>${site.tagline}. Rápidas, sin registro y, siempre que se puede, sin que tus archivos salgan de tu dispositivo.</p>
    </div>
    <nav class="foot-col" aria-label="Herramientas"><h2>Herramientas</h2>${navCats().map((c) => html`<a href="/herramientas/${c.slug}/">${c.name}</a>`)}</nav>
    <nav class="foot-col" aria-label="Recursos"><h2>Recursos</h2><a href="/herramientas/">Todas las herramientas</a><a href="/guias/">Guías</a><a href="/contacto/">Contacto</a></nav>
    <nav class="foot-col" aria-label="Legal"><h2>Legal</h2><a href="/aviso-legal/">Aviso legal</a><a href="/privacidad/">Privacidad</a><a href="/cookies/">Cookies</a><a href="/condiciones/">Condiciones de uso</a></nav>
  </div>
  <div class="wrap foot-bottom"><span>© ${new Date().getFullYear()} ${site.name}</span>${site.gaId ? html`<button type="button" class="linklike" data-consent-reset>${icon('shield')} Configurar cookies</button>` : html`<span>${icon('shield')} Sin cookies de seguimiento</span>`}</div>
</footer>
${site.gaId ? html`<div id="consent" class="consent" role="region" aria-label="Aviso de cookies" data-ga="${site.gaId}" hidden>
  <p>Usamos cookies de analítica (Google Analytics) <strong>solo si las aceptas</strong>, para saber qué herramientas se usan y mejorarlas. Tus archivos y textos nunca se envían. <a href="/cookies/">Más información</a>.</p>
  <div class="consent-actions"><button type="button" class="btn btn-sm" data-reject>Rechazar</button><button type="button" class="btn btn-sm btn-primary" data-accept>Aceptar</button></div>
</div>` : ''}
</body>
</html>`.s;
}
