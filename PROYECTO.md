---
title: Utilia
aliases: [Utilia, Plataforma de herramientas online]
type: project
status: active
phase: v1-lista-para-desplegar
platform: [web]
created: 2026-09-24
---
# Utilia — memoria interna del proyecto

Fuente de verdad. Léelo antes de tocar código. Público: [README](README.md).

## Visión

Plataforma de herramientas online gratuitas: «necesito hacer algo → entro → la uso → obtengo el resultado». Herramientas como núcleo (no artículos), SEO desde el primer día, monetizable sin saturar. Regla: **¿esto la hace más útil, rápida, escalable y fácil?** Si no, no entra. Calidad > cantidad.

## Decisiones de arquitectura (restricciones)

| Decisión | Por qué |
|---|---|
| **Estático generado** (`build.js` → `dist/`), Node ≥ 22.13, sin framework ni bundler | Cada página es HTML real (SEO, velocidad, CLS 0). Hosting en cualquier CDN. |
| Solo 2 dependencias (dev): **pdf-lib** (MIT) y **pdfjs-dist** (Apache-2.0), copiadas a `dist/a/<hash>/js/vendor/` | PDF serio en el navegador. Se cargan solo en herramientas PDF. |
| Assets en `/a/<hash>/` (hash de contenido) | Caché `immutable` de 1 año; las importaciones relativas de los módulos quedan versionadas solas. |
| **Registro único** `src/registry.js` + metadata en `src/tools/<categoría>.js` | Añadir herramienta = objeto de metadata + función. Páginas, SEO, buscador, sitemap, relacionadas salen solos. |
| Runtime genérico `public/js/tool.js` | Ninguna herramienta tiene UI propia: campos declarativos → `family[slug](valores, ctx)` → salida tipada (`stats`, `rows`, `table`, `text`, `files`, `diff`, `marks`, `serp`, `swatches`, `notes`). |
| Tipos A/B/C: `client` / `server` / `ai` | A por defecto (privacidad, coste 0). B: `api/process.js` (en memoria, firma binaria, límite, timeout, rate limit) — **sin procesadores aún**. C: `api/ai.js` (OpenAI/Gemini por `fetch`, claves solo en entorno). |
| API con `Request→Response` estándar (`api/router.js`) | La misma usa `server.js` (Node) y `netlify/functions/api.mjs`. |
| Persistencia: Supabase/PostgREST vía `fetch` si hay `SUPABASE_*`; si no, JSONL en `DATA_DIR`; si no, log | Sin driver ni ORM. Esquema en `db/schema.sql`. **No Hostinger para BD.** |
| CSP estricta `'self'` sin inline (solo `'wasm-unsafe-eval'` para pdf.js) | XSS cerrado por defecto. Nada de `style=""`/`<script>` inline; JSON-LD es bloque de datos. |
| Google Analytics 4 (`G-CNZEVCVLGJ`, la misma propiedad que Aprende Informática — decisión del usuario 2026-09-24; filtrar por hostname en GA) **solo tras consentimiento** (`public/js/consent.js`, patrón de En sus manos) | RGPD/LSSI: sin «Aceptar» no se carga nada de Google. `GA_ID` cambia el ID, `GA_ID=off` lo quita junto con el banner. Convive con la analítica propia (sin cookies). **Si se activan anuncios → CMP completo.** |
| Verificación de Search Console: `public/root/googlefa9bb534d9a56f77.html` | Se publica en la raíz; el build la excluye de sus comprobaciones de página. |
| Monedas: GET /api/rates hace de proxy de Frankfurter v2 (/rates?base=EUR), caché 1 h, tipo cruzado en cliente | El navegador no contacta con terceros (CSP 'self', privacidad); una sola petición cubre todos los pares; si el proveedor cae se sirve el último tipo con aviso. Upstream configurable con RATES_API. |
| Nombre «Utilia» provisional | `SITE_NAME`. El usuario no fijó marca. Si cambia, regenerar imágenes (`npm run images`) no hace falta: el logo no lleva texto. |
| Datos legales = placeholders visibles `[…]` | No inventar datos de empresa. Se rellenan con `LEGAL_*`, `CONTACT_EMAIL`. |

## Añadir una herramienta

1. Metadata en `src/tools/<categoría>.js` (slug, name, family, type, fields, short, description ≤170, seoTitle, keywords, howto, about, faq, related, status).
2. Función `'<slug>': (valores, ctx) => salida` en `public/js/tools/<family>.js` (lanza `ToolError` para mensajes al usuario; `null` = sin resultado).
3. `npm test` (comprueba que la función existe) y `npm run build` (falla con enlaces rotos, H1 ≠ 1, títulos duplicados, relacionadas inexistentes).

## Estado (2026-09-24)

**Hecho — fases 1-14 de la v1:**
- 82 herramientas publicadas: PDF 12 (unir, dividir, comprimir sin pérdida/fuerte, rotar, eliminar, reordenar, JPG/PNG→PDF, PDF→JPG, PDF→texto, contador, analizador), imágenes 12, texto 11, conversores 11 de unidades + monedas, calculadoras 14, desarrollo 15, SEO 6. «Resumir texto» (IA) en borrador hasta configurar proveedor.
- 27 páginas programáticas `/conversor/<a>-a-<b>` con tabla y fórmula (curadas en `PAIRS`); `/convertir/*` → 301 a la herramienta canónica.
- Home (hero, buscador, populares, categorías, rápidas, nuevas, favoritos/recientes/recomendadas locales), `/herramientas`, 8 categorías (IA noindex mientras esté vacía), 7 guías, legal (aviso, privacidad, cookies, condiciones), contacto (honeypot + trampa de tiempo + rate limit + consentimiento), 404/500.
- SEO: title/description/canonical/OG/Twitter, BreadcrumbList, SoftwareApplication, FAQPage, WebSite+SearchAction, Organization, Article; sitemap, robots, manifest, favicon/ICO/apple-touch/og.png (`scripts/make-images.js`, sin dependencias).
- Buscador con sinónimos, plurales, sin tildes y dirección («foto a pdf» → JPG a PDF).
- Analítica propia agregada (sin cookies/IP, respeta GPC/DNT).
- QA: todas las herramientas probadas en navegador; móvil 375 px sin desbordes; claro/oscuro; contraste AA; labels; 16 tests `npm test`.

**Pendiente / siguiente:**
- [ ] Decidir marca y dominio → `SITE_URL`, `SITE_NAME`, datos legales.
- [ ] Desplegar (GitHub + Netlify, `netlify.toml` listo) y dar de alta en Search Console.
- [ ] Supabase: ejecutar `db/schema.sql` y definir `SUPABASE_*` (si no, en Netlify la analítica solo va a logs).
- [ ] IA: `AI_PROVIDER` + `AI_MODEL` + clave → publica «Resumir texto». Siguientes: OCR inteligente, análisis de documentos.
- [ ] Faltan del plan: proteger/desbloquear/firmar PDF, OCR, AVIF (el navegador no lo codifica), páginas programáticas /conversor/eur-a-usd (tabla rellenada en cliente para no servir tipos caducados), HTML/JS formatter, cron, schema generator.
- [ ] «Más utilizadas» dinámico: vista `tool_popularity_30d` → volcar `popularity` en build.
- [ ] Panel admin: el esquema está; hoy el catálogo se edita en `src/tools/*.js`.
- [ ] Rate limit en memoria: con varias instancias, mover a Redis/Upstash.

## Comandos

`npm install` · `npm run dev` (build + servidor con recarga, :8141) · `npm run build` · `npm start` · `npm test` · `npm run images`
