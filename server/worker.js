// Punto de entrada para Cloudflare Workers.
// No reescribe el servidor: envuelve el mismo http.Server de index.js (con
// node:http + nodejs_compat) usando el adaptador oficial de Cloudflare.
// Para correr localmente con `node server/index.js` esto no se usa — ese
// camino sigue llamando a server.listen() directo, como siempre.

const { httpServerHandler } = require('cloudflare:node');
const { server, PORT } = require('./index');

server.listen(PORT);

module.exports = httpServerHandler({ port: PORT });
