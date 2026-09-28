// Genera las creatividades de Google Ads (ads/) y el logotipo (public/root/logo.png) con la identidad real
// de la web: símbolo de 4 módulos, índigo #4f46e5/#7c7cff, tipografía del sistema. Renderiza con Edge headless.
// Uso: node scripts/make-ads.js   (Windows, requiere Microsoft Edge)
import { writeFileSync, mkdirSync, existsSync, statSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { icons } from '../src/icons.js';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if (!EDGE) throw new Error('No se encuentra Microsoft Edge para renderizar.');
const TMP = root('ads/_html'); mkdirSync(TMP, { recursive: true });

const mark = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill="#141826"/><rect x="8" y="8" width="7" height="7" rx="2" fill="#7c7cff"/><rect x="17" y="8" width="7" height="7" rx="2" fill="#e6e8ef"/><rect x="8" y="17" width="7" height="7" rx="2" fill="#e6e8ef"/><rect x="17" y="17" width="7" height="7" rx="3.5" fill="#e6e8ef"/></svg>`;
const ic = (name, size, color = 'currentColor') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
const CATS = [['file', 'PDF'], ['image', 'Imágenes'], ['calc', 'Calculadoras'], ['swap', 'Conversores'], ['code', 'Desarrollo'], ['search', 'SEO']];

const base = (w, h, body, extra = '') => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:"Segoe UI Variable Display","Segoe UI",system-ui,sans-serif;color:#0f1219;-webkit-font-smoothing:antialiased;
  background:radial-gradient(70% 90% at 85% 0%,#eceaff 0%,rgba(236,234,255,0) 60%),radial-gradient(60% 70% at 0% 100%,#eef4ff 0%,rgba(238,244,255,0) 60%),#f7f8fa}
.grid{position:absolute;inset:0;background-image:linear-gradient(#e3e6ec 1px,transparent 1px),linear-gradient(90deg,#e3e6ec 1px,transparent 1px);background-size:48px 48px;opacity:.55;
  -webkit-mask-image:radial-gradient(60% 70% at 80% 30%,#000 10%,transparent 75%)}
.brand{display:flex;align-items:center;gap:.32em;font-weight:700;letter-spacing:-.035em}
.brand b{font-weight:700}
h1{font-weight:750;letter-spacing:-.04em;line-height:1.02}
h1 em{font-style:normal;color:#4f46e5}
.tile{display:grid;place-items:center;background:#fff;border:1px solid #e3e6ec;border-radius:22px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 18px 40px -18px rgba(16,24,40,.25);color:#4f46e5}
.tile.hi{background:#4f46e5;border-color:#4f46e5;color:#fff;box-shadow:0 22px 40px -16px rgba(79,70,229,.55)}
${extra}</style></head><body><div class="grid"></div>${body}</body></html>`;

const pages = {
  // 1200×628 (1,91:1): texto a la izquierda, rejilla de herramientas a la derecha.
  'utiliaa-horizontal-1200x628': [1200, 628, base(1200, 628, `
<main style="position:absolute;left:84px;top:0;bottom:0;width:660px;display:flex;flex-direction:column;justify-content:center">
  <div class="brand" style="font-size:44px;margin-bottom:46px">${mark(58)}<span>utiliaa</span></div>
  <h1 style="font-size:84px">82 herramientas<br>online <em>gratis</em></h1>
  <p style="margin-top:30px;font-size:23px;font-weight:500;color:#4a5263;letter-spacing:-.01em">PDF · Imágenes · Calculadoras · Conversores · Texto · SEO</p>
</main>
<div style="position:absolute;right:78px;top:50%;transform:translateY(-50%);display:grid;grid-template-columns:repeat(3,118px);gap:22px">
  ${['file', 'image', 'calc', 'swap', 'code', 'search', 'text', 'percent', 'palette'].map((n, i) => `<div class="tile${i === 4 ? ' hi' : ''}" style="width:118px;height:118px">${ic(n, 52)}</div>`).join('')}
</div>`)],
  // 1200×1200: legible en móvil; seis categorías en rejilla 3×2.
  'utiliaa-cuadrado-1200x1200': [1200, 1200, base(1200, 1200, `
<main style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:118px">
  <div class="brand" style="font-size:60px">${mark(84)}<span>utiliaa</span></div>
  <h1 style="font-size:118px;margin-top:70px">82 herramientas<br>online <em>gratis</em></h1>
  <div style="margin-top:84px;display:grid;grid-template-columns:repeat(3,300px);gap:26px">
    ${CATS.map(([n, l]) => `<div class="tile" style="height:190px;align-content:center;gap:16px;color:#0f1219">${ic(n, 60, '#4f46e5')}<span style="font-size:36px;font-weight:650;letter-spacing:-.02em">${l}</span></div>`).join('')}
  </div>
</main>`)],
  // 1200×1200: solo marca. El símbolo sirve a tamaño favicon; el nombre, grande y centrado.
  'utiliaa-logo-1200x1200': [1200, 1200, base(1200, 1200, `
<main style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:64px">
  ${mark(520)}
  <div style="font-size:190px;font-weight:700;letter-spacing:-.045em;line-height:1">utiliaa</div>
</main>`, 'body{background:#f7f8fa}.grid{display:none}')],
};

// Además: og.png de la web (1200×630, mismo diseño que el anuncio horizontal) y logo.png (schema.org).
const [, , hz] = pages['utiliaa-horizontal-1200x628'];
const jobs = [...Object.entries(pages).map(([name, [w, h, html]]) => [`ads/${name}.png`, w, h, html]), ['public/root/og.png', 1200, 630, hz.replace(/height:628px/g, 'height:630px')]];
for (const [path, w, h, html] of jobs) {
  const file = `${TMP}/${path.replace(/\W/g, '_')}.html`; writeFileSync(file, html);
  const out = root(path);
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${w},${h}`, `--screenshot=${out}`, `file:///${file.replace(/\\/g, '/')}`], { stdio: 'ignore' });
  if (path.includes('utiliaa-logo')) copyFileSync(out, root('public/root/logo.png'));
  console.log(`✓ ${path} (${Math.round(statSync(out).size / 1024)} KB)`);
}
