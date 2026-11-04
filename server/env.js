// Carga variables de entorno desde un archivo .env, sin depender de ningún
// paquete externo (Node 18 no trae soporte nativo para esto todavía).
// Debe ser el primer require de server/index.js.

const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');

function cargarEnv() {
  // En Cloudflare Workers no existe el archivo .env (las variables se
  // configuran con `wrangler secret put` / la sección [vars] de wrangler.toml,
  // y llegan igual a process.env gracias a nodejs_compat). Si fs no está
  // disponible o el archivo no existe, simplemente no hay nada que cargar.
  try {
    if (!fs.existsSync(ENV_PATH)) return;
    const contenido = fs.readFileSync(ENV_PATH, 'utf8');
    contenido.split('\n').forEach(linea => {
      const l = linea.trim();
      if (!l || l.startsWith('#')) return;
      const idx = l.indexOf('=');
      if (idx === -1) return;
      const clave = l.slice(0, idx).trim();
      let valor = l.slice(idx + 1).trim();
      if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
        valor = valor.slice(1, -1);
      }
      if (!(clave in process.env)) process.env[clave] = valor;
    });
  } catch (err) {
    // Entorno sin acceso a disco (Workers): seguimos solo con process.env.
  }
}

cargarEnv();
