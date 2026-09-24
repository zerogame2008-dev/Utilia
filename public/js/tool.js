// Runtime genérico: lee el formulario declarado en la metadata, ejecuta la función de la familia
// (./tools/<family>.js → default[slug]) y pinta el resultado. Ninguna herramienta tiene UI propia.
import { track, pushRecent, iconEl } from './core.js';
import { bytes, zip } from './tools/_shared.js';

const form = document.getElementById('tool');
if (form) init(form);

function init(form) {
  const { slug, family, type } = form.dataset; const live = form.hasAttribute('data-live');
  const options = form.dataset.options ? JSON.parse(form.dataset.options) : {};
  const out = form.querySelector('#output'); const emptyHTML = out.innerHTML;
  const progress = form.querySelector('[data-progress]'); const runBtn = form.querySelector('[data-run]'); const cancelBtn = form.querySelector('[data-cancel]');
  const modP = import(`./tools/${family}.js`).then((m) => m.default);
  const files = {}; let urls = []; let controller = null; let counted = false, interacted = false; let seq = 0;

  // ---------- Valores dinámicos y dependencias entre campos ----------
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  form.querySelectorAll('[data-today]').forEach((i) => { i.value = today(); });
  form.querySelectorAll('[data-now]').forEach((i) => { i.value = String(Math.floor(Date.now() / 1000)); });
  const field = (name) => form.elements.namedItem(name);
  const showIf = () => form.querySelectorAll('[data-show-if]').forEach((w) => { const [, k, op, v] = w.dataset.showIf.match(/^(\w+)(!?=)(.+)$/); const cur = field(k)?.value; w.hidden = op === '=' ? cur !== v : cur === v; });
  const ranges = () => form.querySelectorAll('input[type=range]').forEach((r) => { const o = form.querySelector(`[data-range-out="${r.id}"]`); if (o) o.textContent = r.value + (r.dataset.suffix || ''); });
  const counters = () => form.querySelectorAll('[data-counter-for]').forEach((c) => { const n = [...(document.getElementById(c.dataset.counterFor).value || '')].length; c.textContent = `${n} / ${c.dataset.max}`; c.classList.toggle('over', n > Number(c.dataset.max)); });
  form.querySelectorAll('[data-sync]').forEach((p) => p.addEventListener('input', () => { const t = field(p.dataset.sync); t.value = p.value; t.dispatchEvent(new Event('input', { bubbles: true })); }));
  const refresh = () => { showIf(); ranges(); counters(); };
  refresh();

  // ---------- Archivos ----------
  const SIGS = [['application/pdf', (b) => indexOf(b, [0x25, 0x50, 0x44, 0x46]) >= 0], ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff], ['image/png', (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
    ['image/webp', (b) => str(b, 0, 4) === 'RIFF' && str(b, 8, 12) === 'WEBP'], ['image/gif', (b) => str(b, 0, 4) === 'GIF8'], ['image/bmp', (b) => b[0] === 0x42 && b[1] === 0x4d], ['image/svg+xml', (b) => /<svg[\s>]/i.test(str(b, 0, b.length))]];
  const str = (b, a, z) => String.fromCharCode(...b.slice(a, z));
  function indexOf(b, sig) { outer: for (let i = 0; i <= Math.min(b.length - sig.length, 1024); i++) { for (let j = 0; j < sig.length; j++) if (b[i + j] !== sig[j]) continue outer; return i; } return -1; }
  async function sniff(f) { const b = new Uint8Array(await f.slice(0, 2048).arrayBuffer()); return SIGS.find(([, test]) => test(b))?.[0] || ''; }

  for (const drop of form.querySelectorAll('[data-drop]')) {
    const input = drop.querySelector('input[type=file]'); const name = input.name; const list = drop.parentElement.querySelector('[data-files]');
    const accept = input.accept.split(',').map((s) => s.trim()); const maxMB = Number(drop.dataset.maxMb); const maxFiles = Number(drop.dataset.maxFiles); const sortable = drop.hasAttribute('data-sortable');
    files[name] = [];
    const add = async (incoming) => {
      clearError();
      const errors = [];
      for (const f of incoming) {
        if (files[name].length >= maxFiles) { errors.push(maxFiles === 1 ? 'Solo se admite un archivo: se ha sustituido el anterior.' : `Máximo ${maxFiles} archivos.`); if (maxFiles === 1) files[name] = []; else break; }
        const real = await sniff(f);
        if (!real || !accept.includes(real)) { errors.push(`«${f.name}» no es un formato compatible${real ? ` (es ${real.split('/')[1].toUpperCase()})` : ''}.`); continue; }
        if (f.size > maxMB * 1048576) { errors.push(`«${f.name}» pesa ${bytes(f.size)}: el máximo es ${maxMB} MB.`); continue; }
        if (!f.size) { errors.push(`«${f.name}» está vacío.`); continue; }
        files[name].push(f.type === real ? f : new File([f], f.name, { type: real, lastModified: f.lastModified }));
      }
      renderList(); if (errors.length) showError([...new Set(errors)].join(' '), 'file');
      if (live) schedule();
    };
    const renderList = () => {
      list.replaceChildren(); list.hidden = !files[name].length;
      files[name].forEach((f, i) => {
        const thumb = f.type.startsWith('image/') ? Object.assign(document.createElement('img'), { src: track2(URL.createObjectURL(f)), alt: '', className: 'thumb', width: 40, height: 40, loading: 'lazy', decoding: 'async' }) : Object.assign(document.createElement('span'), { className: 'thumb' });
        if (!f.type.startsWith('image/')) thumb.append(iconEl('file'));
        const meta = el('span', 'f-meta', `${bytes(f.size)} · ${f.type.split('/')[1].replace('svg+xml', 'svg').toUpperCase()}`);
        const li = el('li', '', thumb, el('span', 'f-body', el('span', 'f-name', f.name), meta));
        if (sortable && files[name].length > 1) {
          li.append(btnIcon('up', `Subir ${f.name}`, () => move(i, -1), i === 0), btnIcon('down', `Bajar ${f.name}`, () => move(i, 1), i === files[name].length - 1));
        }
        li.append(btnIcon('x', `Quitar ${f.name}`, () => { files[name].splice(i, 1); renderList(); if (live) schedule(); input.focus(); }));
        list.append(li);
        modP.then((m) => m.describe?.(f)).then((d) => { if (d) meta.textContent += ` · ${d}`; }).catch(() => {});
      });
    };
    const move = (i, d) => { const a = files[name]; [a[i], a[i + d]] = [a[i + d], a[i]]; renderList(); list.children[i + d]?.querySelector(`button[aria-label^="${d < 0 ? 'Subir' : 'Bajar'}"]`)?.focus(); };
    input.addEventListener('change', () => { add([...input.files]); input.value = ''; });
    ['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, () => drop.classList.remove('over')));
    drop.addEventListener('drop', (ev) => { ev.preventDefault(); add([...ev.dataTransfer.files]); });
    if (accept.some((a) => a.startsWith('image/'))) document.addEventListener('paste', (ev) => { const imgs = [...(ev.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/')); if (imgs.length) { ev.preventDefault(); add(imgs); } });
    drop.clear = () => { files[name] = []; renderList(); };
  }
  const track2 = (u) => { urls.push(u); return u; };

  // ---------- Recogida de valores ----------
  function values() {
    const v = {};
    for (const e of form.elements) {
      if (!e.name || e.closest('[hidden]') && e.type !== 'file') continue;
      if (e.type === 'file') v[e.name] = files[e.name];
      else if (e.type === 'checkbox') v[e.name] = e.checked;
      else if (e.type === 'number' || e.type === 'range') v[e.name] = e.value === '' ? undefined : Number(e.value.replace(',', '.'));
      else v[e.name] = e.value;
    }
    return v;
  }

  // ---------- Ejecución ----------
  async function run() {
    const my = ++seq; controller?.abort(); controller = new AbortController();
    const signal = controller.signal; let timer;
    if (type === 'ai' || type === 'server') timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), 90000);
    const heavy = !live;
    if (heavy) setBusy(true);
    const ctx = { signal, options, progress: heavy ? setProgress : () => {} };
    try {
      const mod = await modP;
      const result = await mod[slug](values(), ctx);
      if (my !== seq) return;
      render(result);
      if (result && interacted && !counted) { counted = true; pushRecent(slug); track('tool_use', { tool: slug }); }
    } catch (e) {
      if (my !== seq) return;
      handleError(e, signal);
    } finally { clearTimeout(timer); if (my === seq && heavy) setBusy(false); }
  }
  let debounce; const schedule = () => { clearTimeout(debounce); debounce = setTimeout(run, 160); };

  function setBusy(on) {
    if (runBtn) runBtn.disabled = on; cancelBtn.hidden = !on; progress.hidden = !on; form.setAttribute('aria-busy', String(on));
    if (on) { progress.classList.add('indeterminate'); progress.querySelector('.progress-label').textContent = 'Procesando…'; progress.querySelector('.progress-bar span').style.width = ''; }
  }
  function setProgress(p, label) {
    progress.classList.toggle('indeterminate', p == null); progress.querySelector('.progress-bar span').style.width = p == null ? '' : `${Math.round(p * 100)}%`;
    if (label) progress.querySelector('.progress-label').textContent = label;
  }

  function handleError(e, signal) {
    let msg; let code = e?.code || e?.name || 'error';
    if (e?.name === 'ToolError') msg = e.message;
    else if (signal.aborted && signal.reason?.name === 'TimeoutError') { msg = 'La operación ha tardado demasiado. Inténtalo de nuevo en unos segundos.'; code = 'timeout'; }
    else if (e?.name === 'AbortError') { msg = 'Proceso cancelado.'; code = 'cancel'; }
    else if (e instanceof RangeError || /memory|allocation|quota/i.test(e?.message || '')) { msg = 'El archivo es demasiado grande para la memoria de este dispositivo. Prueba con uno más pequeño o desde un ordenador.'; code = 'memory'; }
    else if (/dynamically imported module|Failed to fetch|Importing a module/i.test(e?.message || '')) { msg = 'No se ha podido cargar la herramienta. Comprueba tu conexión y recarga la página.'; code = 'load'; }
    else { msg = 'No se ha podido completar la operación. Si usas un archivo, comprueba que no esté dañado; si el problema continúa, cuéntanoslo en Contacto.'; console.error(e); }
    if (code !== 'cancel') track('tool_error', { tool: slug, code: String(code).slice(0, 40) });
    showError(msg, code);
  }
  function showError(msg) { const box = el('div', 'error-box', iconEl('alert'), el('div', '', el('strong', '', 'No se ha podido completar'), el('p', '', msg))); box.setAttribute('role', 'alert'); clearError(); out.prepend(box); if (out.querySelector('.output-empty')) out.querySelector('.output-empty').hidden = true; }
  function clearError() { out.querySelector('.error-box')?.remove(); const e = out.querySelector('.output-empty'); if (e) e.hidden = false; }

  // ---------- Salida ----------
  function reset() { urls.forEach(URL.revokeObjectURL); urls = []; out.innerHTML = emptyHTML; }
  function render(r) {
    for (const u of urls.splice(0)) if (!form.querySelector(`img[src="${u}"]`)) URL.revokeObjectURL(u);
    if (!r) { out.innerHTML = emptyHTML; return; }
    const parts = [];
    if (r.stats?.length) parts.push(el('div', `stats stats-${r.stats.length}`, ...r.stats.map(([k, v]) => el('div', 'stat', el('span', '', k), el('strong', '', String(v))))));
    if (r.serp) parts.push(el('div', 'serp', el('div', 's-url', el('span', 's-fav', r.serp.url.charAt(0).toUpperCase()), el('span', '', r.serp.url)), el('p', 's-title', r.serp.title), el('p', 's-desc', r.serp.desc)));
    if (r.swatches?.length) parts.push(el('div', `swatches swatch-${r.swatches.length === 1 ? 1 : 'n'}`, ...r.swatches.map((hex) => { const b = el('button', 'swatch', swatchSpan(hex), hex); b.type = 'button'; b.title = `Copiar ${hex}`; b.addEventListener('click', () => copy(hex, b, true)); return b; })));
    if (r.sync) for (const [k, v] of Object.entries(r.sync)) { const f = field(k); if (f && f.value !== v) f.value = v; }
    if (r.rows?.length) parts.push(el('dl', 'rows', ...r.rows.map(([k, v]) => { const row = el('div', 'row', el('dt', '', k), el('dd', r.copyRows ? 'mono' : '', String(v))); if (r.copyRows) row.append(copyBtn(String(v), true)); return row; })));
    if (r.table?.rows?.length) parts.push(table(r.table));
    if (r.marks) parts.push(marks(r.marks));
    if (r.diff) parts.push(el('pre', 'diff', ...r.diff.map(([op, line]) => el('div', op === '+' ? 'add' : op === '-' ? 'del' : '', line || ' '))));
    if (r.text != null) parts.push(textBlock(r.textLabel || 'Resultado', r.text, r.filename));
    for (const [label, t] of r.extraText || []) parts.push(textBlock(label, t));
    if (r.files?.length) parts.push(filesBlock(r.files, r.zipName));
    if (r.notes?.length) parts.push(el('ul', 'notes', ...r.notes.map((n) => el('li', '', iconEl('info'), el('span', '', n)))));
    out.replaceChildren(...parts);
    if (!live) out.firstElementChild?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  const swatchSpan = (hex) => { const s = el('span', ''); s.style.background = hex; return s; };
  function table({ caption, head, rows }) {
    const t = el('table', 'table'); if (caption) t.append(el('caption', '', caption));
    t.append(el('thead', '', el('tr', '', ...head.map((h) => { const th = el('th', '', h); th.scope = 'col'; return th; }))));
    t.append(el('tbody', '', ...rows.map((r) => el('tr', '', ...r.map((c) => el('td', '', c && typeof c === 'object' ? Object.assign(swatchSpan(c.swatch), { className: 'cell-swatch' }) : String(c)))))));
    return el('div', 'table-wrap', t);
  }
  function marks({ text, ranges }) {
    const pre = el('pre', 'marks'); let last = 0;
    for (const [a, b] of ranges.slice(0, 5000)) { if (a < last) continue; pre.append(text.slice(last, a), el('mark', '', text.slice(a, b))); last = b; }
    pre.append(text.slice(last)); return pre;
  }
  function textBlock(label, text, filename) {
    const ta = el('textarea', 'input'); ta.readOnly = true; ta.value = text; ta.rows = Math.min(18, Math.max(4, text.split('\n').length + 1)); ta.setAttribute('aria-label', label); ta.spellcheck = false;
    const tools = el('div', '', copyBtn(text));
    if (filename) tools.append(downloadBtn(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename));
    return el('div', 'out-text', el('div', 'bar2', el('strong', '', label), tools), ta);
  }
  function filesBlock(list, zipName) {
    const ul = el('ul', 'files-out');
    for (const f of list) {
      const thumb = f.blob.type.startsWith('image/') ? Object.assign(document.createElement('img'), { src: track2(URL.createObjectURL(f.blob)), alt: `Vista previa de ${f.name}`, width: 56, height: 56, decoding: 'async' }) : el('span', 'card-icon', iconEl('file'));
      ul.append(el('li', '', thumb, el('span', 'f-body', el('span', 'f-name', f.name), el('span', 'f-meta', f.note ? `${f.note}` : bytes(f.blob.size))), downloadBtn(f.blob, f.name, true)));
    }
    const wrap = el('div', '', ul);
    if (list.length > 1) {
      const b = button('download', 'Descargar todo (ZIP)', async () => { b.disabled = true; try { save(await zip(list), zipName || `${slug}.zip`); } finally { b.disabled = false; } }); b.classList.add('btn-primary');
      wrap.prepend(el('div', 'files-all', b)); wrap.style.display = 'grid'; wrap.style.gap = '10px';
    } else setTimeout(() => ul.querySelector('a.btn')?.focus({ preventScroll: true }), 50);
    return wrap;
  }
  const save = (blob, name) => { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); track('download', { tool: slug }); };
  function downloadBtn(blob, name, primary = false) {
    const a = el('a', `btn btn-sm${primary ? ' btn-primary' : ''}`, iconEl('download'), el('span', '', 'Descargar'));
    a.href = track2(URL.createObjectURL(blob)); a.download = name; a.addEventListener('click', () => track('download', { tool: slug })); a.setAttribute('aria-label', `Descargar ${name}`);
    return a;
  }
  function copyBtn(text, small = false) { const b = button('copy', small ? '' : 'Copiar', () => copy(text, b)); b.setAttribute('aria-label', 'Copiar'); b.title = 'Copiar'; return b; }
  async function copy(text, b, keepLabel) {
    try { await navigator.clipboard.writeText(text); } catch { const t = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
    b.classList.add('done'); const span = b.querySelector('span:last-child'); const old = span?.textContent;
    if (span && !keepLabel && old) span.textContent = 'Copiado';
    setTimeout(() => { b.classList.remove('done'); if (span && !keepLabel && old) span.textContent = old; }, 1400);
  }
  function button(ic, label, fn) { const b = el('button', 'btn btn-sm', iconEl(ic)); if (label) b.append(el('span', '', label)); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function btnIcon(ic, label, fn, disabled) { const b = el('button', 'icon-btn', iconEl(ic)); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.disabled = !!disabled; b.addEventListener('click', fn); return b; }
  function el(tag, cls, ...kids) { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.filter((k) => k != null)); return e; }

  // ---------- Eventos ----------
  form.addEventListener('input', (e) => { interacted = true; refresh(); if (live && e.target.type !== 'file') schedule(); });
  form.addEventListener('change', () => { interacted = true; refresh(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); interacted = true; run(); });
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } else if (e.key === 'Enter' && e.target.tagName === 'INPUT' && live) e.preventDefault(); });
  form.addEventListener('reset', () => { controller?.abort(); seq++; setBusy(false); form.querySelectorAll('[data-drop]').forEach((d) => d.clear()); setTimeout(() => { form.querySelectorAll('[data-today]').forEach((i) => { i.value = today(); }); refresh(); reset(); if (live) run(); form.querySelector('input:not([type=hidden]),textarea,select')?.focus(); }); });
  cancelBtn.addEventListener('click', () => controller?.abort());
  form.querySelector('[data-regenerate]')?.addEventListener('click', () => { interacted = true; run(); });
  form.querySelector('[data-swap]')?.addEventListener('click', (e) => { const [a, b] = e.currentTarget.dataset.swap.split(',').map(field); [a.value, b.value] = [b.value, a.value]; schedule(); });

  // Compatibilidad: herramientas de archivos necesitan APIs modernas.
  if (family === 'image' && typeof createImageBitmap !== 'function') showError('Tu navegador es demasiado antiguo para esta herramienta. Actualízalo o usa Chrome, Edge, Firefox o Safari recientes.');
  // Instantáneas: con valores por defecto (conversores, generadores) muestran resultado desde el principio.
  if (live) run();
}
