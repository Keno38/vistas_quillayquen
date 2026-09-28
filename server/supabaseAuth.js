// Verifica tokens de Supabase Authentication (el "superadministrador" que
// gestiona contenido: capacidad, servicios, contacto y menú del Centro de
// Eventos). Es un sistema de login totalmente aparte del admin de la agenda
// (ese usa la tabla admin_usuarios). Aquí solo confirmamos con la propia API
// de Supabase que el token que manda el navegador corresponde a un usuario
// real logueado; nunca guardamos contraseñas de este login nosotros.

require('./env');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Devuelve el usuario de Supabase si el token es válido, o null si no.
async function verificarToken(token) {
  if (!token || !SUPABASE_ANON_KEY) return null;
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

module.exports = { verificarToken };
