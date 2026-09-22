// Genera el SQL para cambiar la contraseña del admin en Supabase, sin que la
// contraseña nueva tenga que pasar por el chat ni quedar en ningún archivo.
// Uso: node scripts/generar-password-admin.js "tu contraseña nueva"

const crypto = require('crypto');

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/generar-password-admin.js "tu contraseña nueva"');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');

console.log('Copia y pega esto en el SQL Editor de Supabase:\n');
console.log(
  `update admin_usuarios set salt = '${salt}', password_hash = '${hash}' where usuario = 'admin';`
);
