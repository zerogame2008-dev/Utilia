// Genera las creatividades de Google Ads (ads/) y el logotipo (public/root/logo.png) con la identidad real
// de la web: símbolo de 4 módulos, índigo #4f46e5/#7c7cff, tipografía del sistema. Renderiza con Edge headless.
// Uso: node scripts/make-ads.js   (Windows, requiere Microsoft Edge)
import { writeFileSync, mkdirSync, existsSync, statSync, copyFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
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

// ---------- Creatividades con capturas reales de la web ----------
// Build temporal sin aviso de cookies (GA_ID=off) servido en :8150; capturas de escritorio y de móvil a 2x.
const PORT = 8150, SHOTS = root('ads/_html/shots');
mkdirSync(SHOTS, { recursive: true });
execFileSync(process.execPath, [root('build.js')], { stdio: 'ignore', env: { ...process.env, GA_ID: 'off', SITE_NAME: 'utiliaa' } });
const server = spawn(process.execPath, [root('server.js')], { env: { ...process.env, PORT: String(PORT), GA_ID: 'off', ANALYTICS: 'off' }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const shot = (name, path, w, h, dpr = 1) => execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--force-device-scale-factor=${dpr}`, '--virtual-time-budget=6000', `--window-size=${w},${h}`, `--screenshot=${SHOTS}/${name}.png`, `http://localhost:${PORT}${path}`], { stdio: 'ignore' });
try {
  shot('home', '/', 1280, 800);
  shot('pdf', '/herramientas/pdf/unir-pdf/', 1280, 800);
  shot('moneda', '/herramientas/conversores/conversor-moneda/', 1280, 900);
  shot('home-movil', '/', 500, 1082, 2); // Edge headless no baja de ~500 px de ancho: sigue siendo el diseño móvil
  shot('moneda-movil', '/herramientas/conversores/conversor-moneda/', 500, 1082, 2);
} finally { server.kill(); }
execFileSync(process.execPath, [root('build.js')], { stdio: 'ignore' }); // deja dist/ como estaba

const src = (n) => `file:///${SHOTS.replace(/\\/g, '/')}/${n}.png`;
const browser = (n, w, crop = 0) => `<div style="width:${w}px;border-radius:18px;overflow:hidden;background:#fff;border:1px solid #d3d7df;box-shadow:0 40px 80px -30px rgba(16,24,40,.35)">
  <div style="height:44px;display:flex;align-items:center;gap:8px;padding:0 16px;background:#eef0f4;border-bottom:1px solid #e3e6ec"><i style="width:12px;height:12px;border-radius:50%;background:#f87171"></i><i style="width:12px;height:12px;border-radius:50%;background:#fbbf24"></i><i style="width:12px;height:12px;border-radius:50%;background:#34d399"></i>
  <span style="margin-left:14px;flex:1;height:26px;border-radius:8px;background:#fff;display:flex;align-items:center;padding:0 12px;font-size:14px;color:#4a5263">utiliaa.netlify.app</span></div>
  <img src="${src(n)}" style="display:block;width:100%;margin-top:-${crop}px"></div>`;
const phone = (n, h) => `<div style="height:${h}px;aspect-ratio:500/1082;border-radius:${h * 0.075}px;background:#0f1219;padding:${h * 0.018}px;box-shadow:0 40px 80px -30px rgba(16,24,40,.45)"><img src="${src(n)}" style="display:block;width:100%;height:100%;object-fit:cover;object-position:top;border-radius:${h * 0.06}px"></div>`;
const brand = (s) => `<div class="brand" style="font-size:${s}px">${mark(s * 1.3)}<span>utiliaa</span></div>`;
const title = (s, html) => `<h1 style="font-size:${s}px">${html}</h1>`;
const sub = (s, t) => `<p style="margin-top:${s * 0.9}px;font-size:${s}px;font-weight:500;color:#4a5263;letter-spacing:-.01em">${t}</p>`;
const shotPages = {
  // Escritorio: la home tal cual.
  'utiliaa-web-home-1200x628': [1200, 628, base(1200, 628, `
<main style="position:absolute;left:72px;top:0;bottom:0;width:430px;display:flex;flex-direction:column;justify-content:center">${brand(34)}<div style="height:34px"></div>${title(58, 'Todo lo que necesitas, <em>en el navegador</em>')}${sub(22, 'Sin instalar nada · Sin registro · Gratis')}</main>
<div style="position:absolute;left:560px;top:74px;transform:rotate(-2deg)">${browser('home', 700)}</div>`)],
  // PDF: la herramienta más buscada, con su promesa real (se procesa en el dispositivo).
  'utiliaa-web-pdf-1200x628': [1200, 628, base(1200, 628, `
<main style="position:absolute;left:72px;top:0;bottom:0;width:440px;display:flex;flex-direction:column;justify-content:center">${brand(34)}<div style="height:34px"></div>${title(60, 'Une, divide y comprime <em>PDF</em> gratis')}${sub(21, 'Tus archivos no salen de tu dispositivo')}</main>
<div style="position:absolute;left:560px;top:74px">${browser('pdf', 700)}</div>`)],
  // Cuadrado: móvil con la home.
  'utiliaa-web-movil-1200x1200': [1200, 1200, base(1200, 1200, `
<main style="position:absolute;left:96px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center">${brand(48)}<div style="height:56px"></div>${title(72, '82 herramientas<br>online <em>gratis</em>')}${sub(32, 'También desde el móvil')}</main>
<div style="position:absolute;right:96px;top:120px">${phone('home-movil', 960)}</div>`)],
  // Cuadrado: el conversor de monedas con un resultado real.
  'utiliaa-web-monedas-1200x1200': [1200, 1200, base(1200, 1200, `
<main style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:96px">${brand(46)}<div style="height:44px"></div>${title(84, 'Convierte monedas <em>al instante</em>')}${sub(30, 'Euros, dólares, pesos y 40 monedas más')}</main>
<div style="position:absolute;left:100px;top:450px">${browser('moneda', 1000, 250)}</div>`)],
  // Vertical 4:5 (960×1200).
  'utiliaa-web-vertical-960x1200': [960, 1200, base(960, 1200, `
<main style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:84px">${brand(42)}<div style="height:36px"></div>${title(76, '82 herramientas<br>online <em>gratis</em>')}${sub(26, 'PDF · Imágenes · Calculadoras · Conversores')}</main>
<div style="position:absolute;left:50%;top:520px;transform:translateX(-50%)">${phone('moneda-movil', 820)}</div>`)],
};

// Además: og.png de la web (1200×630, mismo diseño que el anuncio horizontal) y logo.png (schema.org).
const [, , hz] = pages['utiliaa-horizontal-1200x628'];
const jobs = [...Object.entries({ ...pages, ...shotPages }).map(([name, [w, h, html]]) => [`ads/${name}.png`, w, h, html]), ['public/root/og.png', 1200, 630, hz.replace(/height:628px/g, 'height:630px')]];
for (const [path, w, h, html] of jobs) {
  const file = `${TMP}/${path.replace(/\W/g, '_')}.html`; writeFileSync(file, html);
  const out = root(path);
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${w},${h}`, `--screenshot=${out}`, `file:///${file.replace(/\\/g, '/')}`], { stdio: 'ignore' });
  if (path.includes('utiliaa-logo')) copyFileSync(out, root('public/root/logo.png'));
  console.log(`✓ ${path} (${Math.round(statSync(out).size / 1024)} KB)`);
}
