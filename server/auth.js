const crypto = require('crypto');
const { pg } = require('./supabaseClient');

// Tokens de sesión en memoria (simple, suficiente para un panel de un solo administrador).
// Se pierden si se reinicia el servidor, lo que obliga a iniciar sesión de nuevo: aceptable
// para este uso.
const sesiones = new Map(); // token -> { usuario, expira }
const intentosFallidos = new Map(); // clave (usuario+ip) -> { intentos, bloqueadoHasta }

const DURACION_SESION_MS = 8 * 60 * 60 * 1000; // 8 horas
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

function estaBloqueado(clave) {
  const registro = intentosFallidos.get(clave);
  if (!registro) return 0;
  if (registro.bloqueadoHasta && Date.now() < registro.bloqueadoHasta) {
    return registro.bloqueadoHasta - Date.now();
  }
  if (registro.bloqueadoHasta && Date.now() >= registro.bloqueadoHasta) {
    intentosFallidos.delete(clave);
  }
  return 0;
}

function registrarIntentoFallido(clave) {
  const registro = intentosFallidos.get(clave) || { intentos: 0, bloqueadoHasta: 0 };
  registro.intentos += 1;
  if (registro.intentos >= MAX_INTENTOS) {
    registro.bloqueadoHasta = Date.now() + BLOQUEO_MS;
  }
  intentosFallidos.set(clave, registro);
}

async function login(usuario, password, ip = '') {
  const clave = `${usuario || ''}|${ip}`;
  const msRestantes = estaBloqueado(clave);
  if (msRestantes > 0) {
    const error = new Error(`Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(msRestantes / 60000)} minuto(s).`);
    error.bloqueado = true;
    throw error;
  }

  const filas = await pg(`/admin_usuarios?usuario=eq.${encodeURIComponent(usuario)}&select=*`);
  const admin = filas[0];
  if (!admin) { registrarIntentoFallido(clave); return null; }
  const hash = hashPassword(password, admin.salt);
  if (hash !== admin.password_hash) { registrarIntentoFallido(clave); return null; }

  intentosFallidos.delete(clave);
  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, { usuario, rol: admin.rol || 'agenda', expira: Date.now() + DURACION_SESION_MS });
  return { token, rol: admin.rol || 'agenda' };
}

// Devuelve { usuario, rol } si la sesión es válida, o null si no.
function obtenerSesion(token) {
  if (!token) return null;
  const sesion = sesiones.get(token);
  if (!sesion) return null;
  if (Date.now() > sesion.expira) {
    sesiones.delete(token);
    return null;
  }
  return { usuario: sesion.usuario, rol: sesion.rol };
}

function verificar(token) {
  return obtenerSesion(token) !== null;
}

function logout(token) {
  sesiones.delete(token);
}

module.exports = { login, verificar, logout, hashPassword, obtenerSesion };
