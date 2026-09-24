// Herramientas tipo B (procesamiento en servidor). Contrato de un procesador:
//   processors['mi-herramienta'] = { accept: ['application/pdf'], maxMB: 20, timeoutMs: 25000, run: async (bytes, { type, name }) => objeto JSON | Response }
// El router ya aplica: mismo origen, rate limit, límite de tamaño, validación por firma binaria y timeout.
// Ahora mismo no hay ninguno: todas las herramientas publicadas funcionan en el navegador.
export const processors = {};

const SIG = [['application/pdf', (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46], ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff], ['image/png', (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47], ['image/webp', (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50]];
export const sniff = (b) => SIG.find(([, t]) => t(b))?.[0] || 'application/octet-stream';
