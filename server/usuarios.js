// Gestión de usuarios y accesos (tabla admin_usuarios). Solo lo puede usar
// alguien con rol "general" (ver requireGeneral en server/index.js), para que
// no dependan de mí cada vez que necesiten un usuario nuevo.

const crypto = require('crypto');
const { pg } = require('./supabaseClient');
const { hashPassword } = require('./auth');

const ROLES = ['agenda', 'general'];

function validarRol(rol) {
  if (!ROLES.includes(rol)) {
    const err = new Error('El rol debe ser "agenda" o "general"');
    err.status = 400;
    throw err;
  }
}

// Nunca devolvemos salt/password_hash al navegador.
async function listar() {
  return pg('/admin_usuarios?select=usuario,rol&order=usuario.asc');
}

async function crear({ usuario, password, rol }) {
  if (!usuario || !String(usuario).trim()) {
    const err = new Error('Debe indicar un nombre de usuario');
    err.status = 400;
    throw err;
  }
  if (!password || String(password).length < 6) {
    const err = new Error('La contraseña debe tener al menos 6 caracteres');
    err.status = 400;
    throw err;
  }
  validarRol(rol);
  const salt = crypto.randomBytes(16).toString('hex');
  const password_hash = hashPassword(password, salt);
  const insertados = await pg('/admin_usuarios', {
    method: 'POST',
    body: { usuario: String(usuario).trim(), salt, password_hash, rol }
  });
  const fila = insertados[0];
  return { usuario: fila.usuario, rol: fila.rol };
}

async function cambiarPassword(usuario, password) {
  if (!password || String(password).length < 6) {
    const err = new Error('La contraseña debe tener al menos 6 caracteres');
    err.status = 400;
    throw err;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const password_hash = hashPassword(password, salt);
  const actualizados = await pg(`/admin_usuarios?usuario=eq.${encodeURIComponent(usuario)}`, {
    method: 'PATCH',
    body: { salt, password_hash }
  });
  if (!actualizados[0]) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }
  return { usuario: actualizados[0].usuario, rol: actualizados[0].rol };
}

async function eliminar(usuario) {
  const todos = await pg('/admin_usuarios?select=usuario,rol');
  const objetivo = todos.find(u => u.usuario === usuario);
  if (!objetivo) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }
  if (objetivo.rol === 'general' && todos.filter(u => u.rol === 'general').length <= 1) {
    const err = new Error('No puedes eliminar el único usuario con rol "general" (te quedarías sin acceso a Contenido).');
    err.status = 400;
    throw err;
  }
  await pg(`/admin_usuarios?usuario=eq.${encodeURIComponent(usuario)}`, { method: 'DELETE' });
  return objetivo;
}

module.exports = { listar, crear, cambiarPassword, eliminar };
