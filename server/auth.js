const crypto = require('crypto');
const { pg } = require('./supabaseClient');

// Tokens de sesión en memoria (simple, suficiente para un panel de un solo administrador).
// Se pierden si se reinicia el servidor, lo que obliga a iniciar sesión de nuevo: aceptable
// para este uso.
const sesiones = new Map(); // token -> { usuario, expira }

const DURACION_SESION_MS = 8 * 60 * 60 * 1000; // 8 horas

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

async function login(usuario, password) {
  const filas = await pg(`/admin_usuarios?usuario=eq.${encodeURIComponent(usuario)}&select=*`);
  const admin = filas[0];
  if (!admin) return null;
  const hash = hashPassword(password, admin.salt);
  if (hash !== admin.password_hash) return null;

  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, { usuario, expira: Date.now() + DURACION_SESION_MS });
  return token;
}

function verificar(token) {
  if (!token) return false;
  const sesion = sesiones.get(token);
  if (!sesion) return false;
  if (Date.now() > sesion.expira) {
    sesiones.delete(token);
    return false;
  }
  return true;
}

function logout(token) {
  sesiones.delete(token);
}

module.exports = { login, verificar, logout, hashPassword };
