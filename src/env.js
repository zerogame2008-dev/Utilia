// Carga .env si existe (sin dependencias). Las variables ya definidas en el entorno tienen prioridad.
import { existsSync, readFileSync } from 'node:fs';

const file = new URL('../.env', import.meta.url);
if (existsSync(file)) {
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
