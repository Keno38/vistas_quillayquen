// Punto de entrada para Cloudflare Workers.
// No reescribe el servidor: envuelve el mismo http.Server de index.js (con
// node:http + nodejs_compat) usando el adaptador oficial de Cloudflare.
// Para correr localmente con `node server/index.js` esto no se usa — ese
// camino sigue llamando a server.listen() directo, como siempre.
//
// Tiene que ser ES Module (import/export) porque así lo exige el bundler de
// Wrangler para reconocer el "export default" como el handler del Worker;
// index.js sigue siendo CommonJS y se carga aquí con createRequire.

import { httpServerHandler } from 'cloudflare:node';
import indexModule from './index.js';

const { server, PORT } = indexModule;

server.listen(PORT);

export default httpServerHandler({ port: PORT });
