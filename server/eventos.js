const { pg } = require('./supabaseClient');

function validarFecha(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !isNaN(Date.parse(fecha));
}

function validarMes(mes) {
  return /^\d{4}-\d{2}$/.test(mes);
}

// Devuelve, para cada día del mes solicitado, el estado del salón de eventos:
// 'libre'      -> no hay ninguna solicitud ni evento confirmado ese día
// 'pendiente'  -> hay una solicitud esperando confirmación (aún se puede seguir cotizando)
// 'confirmado' -> el salón ya está comprometido ese día
async function calendario(mes) {
  if (!validarMes(mes)) {
    const err = new Error('Mes inválido, use formato AAAA-MM');
    err.status = 400;
    throw err;
  }

  const [anio, mesNum] = mes.split('-').map(Number);
  const diasEnMes = new Date(anio, mesNum, 0).getDate();

  const [config] = await pg('/config?id=eq.1&select=menu_evento_nombre,menu_evento_precio_por_persona');
  const eventosDelMes = await pg(
    `/eventos?fecha=gte.${mes}-01&fecha=lte.${mes}-${diasEnMes}&estado=neq.rechazado&select=fecha,estado`
  );

  const dias = [];
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = `${mes}-${String(d).padStart(2, '0')}`;
    const delDia = eventosDelMes.filter(e => e.fecha === fecha);
    let estado = 'libre';
    if (delDia.some(e => e.estado === 'confirmado')) estado = 'confirmado';
    else if (delDia.some(e => e.estado === 'pendiente')) estado = 'pendiente';
    dias.push({ fecha, estado });
  }
  return {
    mes,
    dias,
    menu: { nombre: config.menu_evento_nombre, precio_por_persona: config.menu_evento_precio_por_persona }
  };
}

async function solicitar({ fecha, contacto_nombre, institucion, telefono, con_menu, cantidad_personas, comentario }) {
  if (!validarFecha(fecha)) {
    const err = new Error('Fecha inválida, use formato AAAA-MM-DD');
    err.status = 400;
    throw err;
  }
  if (!contacto_nombre || !telefono) {
    const err = new Error('Debe indicar nombre de contacto y teléfono');
    err.status = 400;
    throw err;
  }

  const confirmados = await pg(`/eventos?fecha=eq.${fecha}&estado=eq.confirmado&select=id`);
  if (confirmados.length > 0) {
    const err = new Error('Ese día ya está confirmado con otro evento. Elige otra fecha.');
    err.status = 409;
    throw err;
  }

  const insertados = await pg('/eventos', {
    method: 'POST',
    body: {
      fecha,
      contacto_nombre: String(contacto_nombre).trim(),
      institucion: institucion ? String(institucion).trim() : '',
      telefono: String(telefono).trim(),
      con_menu: Boolean(con_menu),
      cantidad_personas: cantidad_personas ? Number(cantidad_personas) : null,
      comentario: comentario ? String(comentario).trim() : '',
      estado: 'pendiente' // requiere confirmación manual del administrador
    }
  });
  return insertados[0];
}

async function listar({ estado } = {}) {
  let query = '/eventos?select=*&order=fecha.asc';
  if (estado) query += `&estado=eq.${estado}`;
  return pg(query);
}

async function cambiarEstado(id, nuevoEstado) {
  if (!['pendiente', 'confirmado', 'rechazado'].includes(nuevoEstado)) {
    const err = new Error('Estado inválido');
    err.status = 400;
    throw err;
  }

  const [evento] = await pg(`/eventos?id=eq.${Number(id)}&select=*`);
  if (!evento) {
    const err = new Error('Solicitud no encontrada');
    err.status = 404;
    throw err;
  }

  if (nuevoEstado === 'confirmado') {
    const otroConfirmado = await pg(
      `/eventos?id=neq.${evento.id}&fecha=eq.${evento.fecha}&estado=eq.confirmado&select=id`
    );
    if (otroConfirmado.length > 0) {
      const err = new Error('Ya existe otro evento confirmado ese mismo día');
      err.status = 409;
      throw err;
    }
  }

  try {
    const actualizados = await pg(`/eventos?id=eq.${evento.id}`, {
      method: 'PATCH',
      body: { estado: nuevoEstado }
    });
    return actualizados[0];
  } catch (err) {
    if (err.status === 409) {
      err.message = 'Ya existe otro evento confirmado ese mismo día';
    }
    throw err;
  }
}

module.exports = { calendario, solicitar, listar, cambiarEstado };
