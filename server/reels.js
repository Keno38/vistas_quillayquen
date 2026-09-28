// Reels de Instagram para la galería. Se administran pegando la URL del reel
// (no hay integración automática con la API de Meta todavía, ver README).
const { pg } = require('./supabaseClient');

const CUENTAS = ['vistas', 'ferreteria'];

async function listarPublicos() {
  return pg('/reels?activo=eq.true&select=id,url,cuenta,titulo&order=orden.asc,id.desc');
}

async function listarTodos() {
  return pg('/reels?select=*&order=orden.asc,id.desc');
}

function validarCuenta(cuenta) {
  if (!CUENTAS.includes(cuenta)) {
    const err = new Error('La cuenta debe ser "vistas" o "ferreteria"');
    err.status = 400;
    throw err;
  }
}

async function crear({ url, cuenta, titulo, orden }) {
  if (!url || !String(url).trim()) {
    const err = new Error('Debe indicar la URL del reel');
    err.status = 400;
    throw err;
  }
  validarCuenta(cuenta);
  const insertados = await pg('/reels', {
    method: 'POST',
    body: {
      url: String(url).trim(),
      cuenta,
      titulo: titulo ? String(titulo).trim() : '',
      orden: orden !== undefined ? Number(orden) : 0
    }
  });
  return insertados[0];
}

async function actualizar(id, { url, cuenta, titulo, activo, orden }) {
  const cambios = {};
  if (url !== undefined) cambios.url = String(url).trim();
  if (cuenta !== undefined) { validarCuenta(cuenta); cambios.cuenta = cuenta; }
  if (titulo !== undefined) cambios.titulo = String(titulo).trim();
  if (activo !== undefined) cambios.activo = Boolean(activo);
  if (orden !== undefined) cambios.orden = Number(orden);
  const actualizados = await pg(`/reels?id=eq.${Number(id)}`, { method: 'PATCH', body: cambios });
  if (!actualizados[0]) {
    const err = new Error('Reel no encontrado');
    err.status = 404;
    throw err;
  }
  return actualizados[0];
}

async function eliminar(id) {
  const eliminados = await pg(`/reels?id=eq.${Number(id)}`, { method: 'DELETE' });
  if (!eliminados || eliminados.length === 0) {
    const err = new Error('Reel no encontrado');
    err.status = 404;
    throw err;
  }
  return eliminados[0];
}

module.exports = { listarPublicos, listarTodos, crear, actualizar, eliminar };
