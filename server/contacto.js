// Datos de contacto y ubicación del Centro de Eventos, editables desde Contenido.
const { pg } = require('./supabaseClient');

const CAMPOS = ['correo_contacto', 'telefono_contacto', 'direccion_recinto', 'mapa_embed_url', 'video_como_llegar_url'];

async function obtenerContacto() {
  const [config] = await pg(`/config?id=eq.1&select=${CAMPOS.join(',')}`);
  return CAMPOS.reduce((datos, campo) => ({ ...datos, [campo]: config ? config[campo] : null }), {});
}

async function actualizarContacto(datos) {
  const cambios = {};
  for (const campo of CAMPOS) {
    if (datos[campo] !== undefined) {
      const valor = String(datos[campo] ?? '').trim();
      cambios[campo] = valor === '' ? null : valor;
    }
  }
  if (Object.keys(cambios).length === 0) return obtenerContacto();
  await pg('/config?id=eq.1', { method: 'PATCH', body: cambios });
  return obtenerContacto();
}

module.exports = { obtenerContacto, actualizarContacto };
