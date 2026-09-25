// Cliente mínimo para Supabase Storage (guardar/leer los comprobantes de
// transferencia), usando solo `fetch` nativo — igual que supabaseClient.js.
// El bucket "comprobantes" es privado: solo el servidor (con la clave
// service_role) puede subir o descargar archivos de ahí.

require('./env');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STORAGE_URL = `${(SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1`;
const BUCKET = 'comprobantes';

function headersAuth() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
  };
}

// Sube un comprobante y devuelve la ruta interna (para guardar en la base de datos).
async function subirComprobante(nombreArchivo, buffer, contentType) {
  const ruta = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${nombreArchivo}`;
  const resp = await fetch(`${STORAGE_URL}/object/${BUCKET}/${ruta}`, {
    method: 'POST',
    headers: { ...headersAuth(), 'Content-Type': contentType },
    body: buffer
  });
  if (!resp.ok) {
    const texto = await resp.text().catch(() => '');
    const err = new Error(`No se pudo subir el comprobante: ${texto || resp.statusText}`);
    err.status = 500;
    throw err;
  }
  return ruta;
}

// Descarga un comprobante ya subido, para que el panel de admin lo muestre.
async function descargarComprobante(ruta) {
  const resp = await fetch(`${STORAGE_URL}/object/${BUCKET}/${ruta}`, { headers: headersAuth() });
  if (!resp.ok) {
    const err = new Error('Comprobante no encontrado');
    err.status = 404;
    throw err;
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  const contentType = resp.headers.get('content-type') || 'application/octet-stream';
  return { buffer, contentType };
}

module.exports = { subirComprobante, descargarComprobante };
