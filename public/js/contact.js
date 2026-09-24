// Formulario de contacto: validación nativa + envío por fetch. Sin JS también funciona (POST normal).
import { track } from './core.js';

const form = document.querySelector('[data-contact]');
if (form) {
  const status = form.querySelector('[data-status]');
  form.querySelector('[data-ts]').value = String(Date.now()); // trampa de tiempo anti-bots
  if (new URLSearchParams(location.search).has('enviado')) { status.textContent = '✓ Mensaje enviado. Te responderemos lo antes posible.'; status.className = 'form-status ok'; }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { const bad = form.querySelector(':invalid'); bad.focus(); status.textContent = bad.validationMessage || 'Revisa los campos marcados.'; status.className = 'form-status err'; return; }
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; status.textContent = 'Enviando…'; status.className = 'form-status';
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se ha podido enviar el mensaje.');
      form.reset(); form.querySelector('[data-ts]').value = String(Date.now());
      status.textContent = '✓ Mensaje enviado. Te responderemos lo antes posible.'; status.className = 'form-status ok'; track('contact');
    } catch (err) { status.textContent = `${err.message} Inténtalo de nuevo o escríbenos por correo.`; status.className = 'form-status err'; } finally { btn.disabled = false; }
  });
}
