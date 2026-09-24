// Desarrollo: reconstruye dist/ y arranca el servidor; `npm run dev` lo reinicia al cambiar src/, public/ o api/.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
execFileSync(process.execPath, [fileURLToPath(new URL('./build.js', import.meta.url))], { stdio: 'inherit' });
await import('./server.js');
