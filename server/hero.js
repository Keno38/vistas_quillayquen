// Imagen de portada (hero) de cada página pública (index / canchas / eventos).
// Se sube desde el panel de Contenido; si una página no tiene fila en
// hero_imagenes, el sitio sigue mostrando su foto de muestra por defecto.

const { pg } = require('./supabaseClient');
const storage = require('./storage');

const PAGINAS = ['index', 'canchas', 'eventos'];

function validarPagina(pagina) {
  if (!PAGINAS.includes(pagina)) {
    const err = new Error('La página debe ser "index", "canchas" o "eventos"');
    err.status = 400;
    throw err;
  }
}

// Para el sitio público: { index: url|null, canchas: url|null, eventos: url|null }
async function obtenerTodos() {
  const filas = await pg('/hero_imagenes?select=*');
  const resultado = { index: null, canchas: null, eventos: null };
  filas.forEach(fila => {
    resultado[fila.pagina] = storage.urlPublicaGaleria(fila.storage_path);
  });
  return resultado;
}

async function actualizar(pagina, archivo) {
  validarPagina(pagina);
  if (!archivo) {
    const err = new Error('Debes adjuntar una imagen');
    err.status = 400;
    throw err;
  }
  const anteriores = await pg(`/hero_imagenes?pagina=eq.${pagina}&select=*`);
  const ruta = await storage.subirGaleria('hero', archivo.filename, archivo.data, archivo.contentType);
  const filas = await pg('/hero_imagenes', {
    method: 'POST',
    prefer: 'return=representation,resolution=merge-duplicates',
    body: { pagina, storage_path: ruta, actualizado_en: new Date().toISOString() }
  });
  if (anteriores[0]) await storage.eliminarGaleria(anteriores[0].storage_path);
  const fila = filas[0];
  return { pagina: fila.pagina, url: storage.urlPublicaGaleria(fila.storage_path) };
}

async function eliminar(pagina) {
  validarPagina(pagina);
  const filas = await pg(`/hero_imagenes?pagina=eq.${pagina}&select=*`);
  const fila = filas[0];
  if (!fila) return null;
  await storage.eliminarGaleria(fila.storage_path);
  await pg(`/hero_imagenes?pagina=eq.${pagina}`, { method: 'DELETE' });
  return fila;
}

module.exports = { obtenerTodos, actualizar, eliminar };
