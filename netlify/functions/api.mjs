// Netlify Functions (v2): mismos handlers que server.js. Sin disco persistente: configura SUPABASE_* para guardar datos.
import { handle } from '../../api/router.js';

export default (req, context) => handle(req, { ip: context.ip });
export const config = { path: '/api/*' };
