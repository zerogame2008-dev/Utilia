// Configuración global. Todo lo que dependa del despliegue viene de variables de entorno.
import './env.js';

const env = process.env;

export const site = {
  name: env.SITE_NAME || 'Utilia',
  url: (env.SITE_URL || 'http://localhost:8141').replace(/\/$/, ''),
  lang: 'es',
  locale: 'es_ES',
  tagline: 'Herramientas online gratuitas',
  description: 'Herramientas online gratuitas para PDF, imágenes, texto, cálculos, conversiones, desarrollo y SEO. Rápidas, sin registro y, siempre que se puede, sin subir tus archivos.',
  // Datos legales: placeholders visibles hasta que el titular los proporcione.
  owner: env.LEGAL_OWNER || '[NOMBRE O RAZÓN SOCIAL DEL TITULAR]',
  ownerId: env.LEGAL_ID || '[NIF/CIF]',
  ownerAddress: env.LEGAL_ADDRESS || '[DOMICILIO]',
  email: env.CONTACT_EMAIL || '[EMAIL DE CONTACTO]',
  // Espacios publicitarios: no se renderizan hasta activarlos (y activar antes un CMP de cookies).
  ads: env.ADS_ENABLED === '1',
  // Google Analytics 4: solo se carga si el visitante acepta el aviso de cookies. GA_ID=off lo desactiva.
  gaId: env.GA_ID === 'off' ? '' : env.GA_ID || 'G-CNZEVCVLGJ',
  analytics: env.ANALYTICS !== 'off',
};
