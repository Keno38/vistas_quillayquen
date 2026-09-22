// Cliente mínimo para hablar con la API REST de Supabase (PostgREST) usando
// solo `fetch`, nativo desde Node 18 — así seguimos sin necesitar `npm install`.
// Usa la clave "service_role", que solo vive en el servidor (ver .env.example)
// y nunca se envía al navegador del cliente.

require('./env');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Faltan SUPABASE_URL y/o SUPABASE_SERVICE_KEY. Copia .env.example a .env y completa los valores ' +
    '(ver README.md, sección "Base de datos Supabase").'
  );
}

const REST_URL = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

// path incluye el nombre de la tabla y los filtros PostgREST, ej: '/eventos?id=eq.5&select=*'
async function pg(path, { method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };
  if (prefer) headers.Prefer = prefer;
  else if (method !== 'GET') headers.Prefer = 'return=representation';

  const resp = await fetch(`${REST_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (!resp.ok) {
    let detalle = '';
    try {
      const json = await resp.json();
      detalle = json.message || json.hint || JSON.stringify(json);
    } catch {
      detalle = await resp.text().catch(() => '');
    }
    const err = new Error(`Error de base de datos: ${detalle || resp.statusText}`);
    // Los conflictos de restricción única de Postgres llegan como 409, los dejamos pasar tal cual.
    err.status = resp.status >= 400 && resp.status < 500 ? resp.status : 500;
    throw err;
  }

  if (resp.status === 204) return null;
  const texto = await resp.text();
  return texto ? JSON.parse(texto) : null;
}

module.exports = { pg };
