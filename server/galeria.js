// Galería de fotos y videos (Recinto / Eventos). Antes se armaba escaneando
// carpetas del servidor a mano; ahora las fotos se suben desde el panel de
// Contenido (superadmin) y quedan guardadas en Supabase (tabla galeria_items
// + bucket público "galeria"), para que sobrevivan a cada despliegue en Render.

const { pg } = require('./supabaseClient');
const storage = require('./storage');

const SECCIONES = ['recinto', 'eventos'];

function mapItem(fila) {
  return {
    id: fila.id,
    tipo: fila.tipo_archivo === 'video' ? 'video' : 'imagen',
    nombre: fila.storage_path.split('/').pop(),
    url: storage.urlPublicaGaleria(fila.storage_path)
  };
}

// Para la página pública: recinto como lista plana, eventos agrupados por álbum.
async function listar() {
  const filas = await pg('/galeria_items?select=*&order=orden.asc,creado_en.desc');
  const recinto = filas.filter(f => f.seccion === 'recinto').map(mapItem);

  const albumes = new Map();
  filas.filter(f => f.seccion === 'eventos').forEach(fila => {
    const nombre = fila.album && fila.album.trim() ? fila.album.trim() : 'Eventos';
    if (!albumes.has(nombre)) albumes.set(nombre, []);
    albumes.get(nombre).push(mapItem(fila));
  });
  const eventos = Array.from(albumes.entries()).map(([nombre, items]) => ({ nombre, items }));

  return { recinto, eventos };
}

// Para el panel de admin: lista plana con todos los campos, para poder editar/borrar.
async function listarTodos() {
  const filas = await pg('/galeria_items?select=*&order=seccion.asc,orden.asc,creado_en.desc');
  return filas.map(fila => ({ ...fila, url: storage.urlPublicaGaleria(fila.storage_path) }));
}

function validarSeccion(seccion) {
  if (!SECCIONES.includes(seccion)) {
    const err = new Error('La sección debe ser "recinto" o "eventos"');
    err.status = 400;
    throw err;
  }
}

async function crear({ seccion, album }, archivo) {
  if (!archivo) {
    const err = new Error('Debes adjuntar una foto o video');
    err.status = 400;
    throw err;
  }
  validarSeccion(seccion);
  const tipo_archivo = (archivo.contentType || '').startsWith('video/') ? 'video' : 'imagen';
  const ruta = await storage.subirGaleria(seccion, archivo.filename, archivo.data, archivo.contentType);
  const insertados = await pg('/galeria_items', {
    method: 'POST',
    body: {
      seccion,
      album: seccion === 'eventos' && album ? String(album).trim() : '',
      storage_path: ruta,
      tipo_archivo
    }
  });
  const fila = insertados[0];
  return { ...fila, url: storage.urlPublicaGaleria(fila.storage_path) };
}

async function actualizar(id, { album }) {
  const cambios = {};
  if (album !== undefined) cambios.album = String(album).trim();
  if (Object.keys(cambios).length === 0) {
    const filas = await pg(`/galeria_items?id=eq.${Number(id)}&select=*`);
    return filas[0];
  }
  const actualizados = await pg(`/galeria_items?id=eq.${Number(id)}`, { method: 'PATCH', body: cambios });
  if (!actualizados[0]) {
    const err = new Error('Foto/video no encontrado');
    err.status = 404;
    throw err;
  }
  return actualizados[0];
}

async function eliminar(id) {
  const filas = await pg(`/galeria_items?id=eq.${Number(id)}&select=*`);
  const fila = filas[0];
  if (!fila) {
    const err = new Error('Foto/video no encontrado');
    err.status = 404;
    throw err;
  }
  await storage.eliminarGaleria(fila.storage_path);
  await pg(`/galeria_items?id=eq.${Number(id)}`, { method: 'DELETE' });
  return fila;
}

module.exports = { listar, listarTodos, crear, actualizar, eliminar };
