// Google Analytics 4 solo tras consentimiento explícito (mismo patrón que En sus manos).
// Sin GA_ID en el build no existe el banner y este módulo no hace nada.
const KEY = 'u.consent';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v) => { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* sin storage: se vuelve a preguntar */ } };

function loadGa(id) {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); }; // gtag exige el objeto arguments
  window.gtag('js', new Date());
  window.gtag('config', id, { anonymize_ip: true });
  const s = document.createElement('script'); s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(s);
}

const banner = document.getElementById('consent');
if (banner) {
  const id = banner.dataset.ga;
  const decide = (v) => { write(v); banner.hidden = true; if (v === 'yes') loadGa(id); };
  banner.querySelector('[data-accept]').addEventListener('click', () => decide('yes'));
  banner.querySelector('[data-reject]').addEventListener('click', () => decide('no'));
  document.querySelectorAll('[data-consent-reset]').forEach((b) => b.addEventListener('click', () => { write(null); banner.hidden = false; banner.querySelector('[data-accept]').focus(); }));
  const v = read();
  if (v === 'yes') loadGa(id); else if (v !== 'no') banner.hidden = false;
}
