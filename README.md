# Utilia

Herramientas online gratuitas para PDF, imágenes, texto, conversiones, cálculos, desarrollo y SEO. Rápidas, sin registro y, siempre que se puede, procesadas en el navegador: tus archivos no salen de tu dispositivo.

## Requisitos

Node 22.13 o superior.

## Uso

```bash
npm install
npm run dev      # http://localhost:8141 (reconstruye al guardar)
npm test
npm run build    # genera dist/
npm start        # sirve dist/ + /api (producción: NODE_ENV=production)
```

Configuración: copia `.env.example` a `.env`. Nunca subas `.env` ni claves al repositorio.

## Despliegue

- **Netlify** (recomendado): conecta el repositorio; `netlify.toml` ya define build, cabeceras de seguridad y la función `/api/*`. Define las variables de entorno en el panel.
- **Cualquier host Node**: `npm ci && npm run build && NODE_ENV=production npm start` detrás de un proxy HTTPS.

Base de datos opcional: PostgreSQL en Supabase (`db/schema.sql`).

## Estructura

```
src/            metadata (tools/, categories, articles), plantillas, registro
public/js/      runtime genérico (tool.js), buscador, familias de herramientas (tools/)
public/css/     sistema de diseño
api/            backend compartido (contacto, analítica, IA, procesamiento en servidor)
build.js        generador estático + comprobaciones (enlaces, H1, títulos)
server.js       servidor Node sin dependencias
test/           node --test
```

Licencias de terceros: pdf-lib (MIT), PDF.js (Apache-2.0).
