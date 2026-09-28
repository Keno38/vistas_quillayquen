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
  return { mes, dias };
}

// Información pública del Centro de Eventos (texto editable por el
// superadmin) + las opciones de menú activas, para el formulario de
// solicitud. El menú solo se muestra ahí, no como texto fijo en la página.
async function infoPublica() {
  const [config] = await pg('/config?id=eq.1&select=eventos_capacidad,eventos_servicios,eventos_contacto');
  const menuOpciones = await pg('/menu_opciones?activo=eq.true&select=id,nombre,precio_por_persona,categoria&order=orden.asc,id.asc');
  return {
    capacidad: config.eventos_capacidad,
    servicios: config.eventos_servicios,
    contacto: config.eventos_contacto,
    menu_opciones: menuOpciones
  };
}

async function actualizarInfo({ capacidad, servicios, contacto }) {
  const cambios = {};
  if (capacidad !== undefined) cambios.eventos_capacidad = String(capacidad).trim();
  if (servicios !== undefined) cambios.eventos_servicios = String(servicios).trim();
  if (contacto !== undefined) cambios.eventos_contacto = String(contacto).trim();
  if (Object.keys(cambios).length === 0) return infoPublica();
  await pg('/config?id=eq.1', { method: 'PATCH', body: cambios });
  return infoPublica();
}

// ---- Opciones de menú (CRUD, lo usa el panel de contenido/superadmin) ----
async function listarMenuOpciones() {
  return pg('/menu_opciones?select=*&order=orden.asc,id.asc');
}

async function crearMenuOpcion({ nombre, precio_por_persona, orden, categoria }) {
  if (!nombre || !String(nombre).trim()) {
    const err = new Error('Debe indicar el nombre de la opción de menú');
    err.status = 400;
    throw err;
  }
  if (!['desayuno', 'almuerzo', 'once'].includes(categoria)) {
    const err = new Error('La categoría debe ser "desayuno", "almuerzo" u "once"');
    err.status = 400;
    throw err;
  }
  const insertados = await pg('/menu_opciones', {
    method: 'POST',
    body: {
      nombre: String(nombre).trim(),
      precio_por_persona: precio_por_persona ? Number(precio_por_persona) : null,
      orden: orden !== undefined ? Number(orden) : 0,
      categoria
    }
  });
  return insertados[0];
}

async function actualizarMenuOpcion(id, { nombre, precio_por_persona, activo, orden, categoria }) {
  const cambios = {};
  if (nombre !== undefined) cambios.nombre = String(nombre).trim();
  if (precio_por_persona !== undefined) cambios.precio_por_persona = precio_por_persona === null || precio_por_persona === '' ? null : Number(precio_por_persona);
  if (activo !== undefined) cambios.activo = Boolean(activo);
  if (orden !== undefined) cambios.orden = Number(orden);
  if (categoria !== undefined) {
    if (!['desayuno', 'almuerzo', 'once'].includes(categoria)) {
      const err = new Error('La categoría debe ser "desayuno", "almuerzo" u "once"');
      err.status = 400;
      throw err;
    }
    cambios.categoria = categoria;
  }
  const actualizados = await pg(`/menu_opciones?id=eq.${Number(id)}`, { method: 'PATCH', body: cambios });
  if (!actualizados[0]) {
    const err = new Error('Opción de menú no encontrada');
    err.status = 404;
    throw err;
  }
  return actualizados[0];
}

async function eliminarMenuOpcion(id) {
  const eliminados = await pg(`/menu_opciones?id=eq.${Number(id)}`, { method: 'DELETE' });
  if (!eliminados || eliminados.length === 0) {
    const err = new Error('Opción de menú no encontrada');
    err.status = 404;
    throw err;
  }
  return eliminados[0];
}

// Valida y devuelve el id de una opción de menú activa, o null si no se eligió
// ninguna. `categoriaEsperada` evita mezclar, por ejemplo, un menú de desayuno
// en el campo de la tarde.
async function validarMenuOpcion(id, categoriaEsperada) {
  if (id === undefined || id === null || id === '') return null;
  const [opcion] = await pg(`/menu_opciones?id=eq.${Number(id)}&activo=eq.true&select=id,categoria`);
  if (!opcion || opcion.categoria !== categoriaEsperada) {
    const err = new Error(`La opción de menú de ${categoriaEsperada} elegida ya no está disponible`);
    err.status = 400;
    throw err;
  }
  return opcion.id;
}

async function solicitar({ fecha, contacto_nombre, institucion, telefono, menu_desayuno_id, menu_almuerzo_id, menu_once_id, cantidad_personas, comentario }) {
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

  const [menuDesayunoId, menuAlmuerzoId, menuOnceId] = await Promise.all([
    validarMenuOpcion(menu_desayuno_id, 'desayuno'),
    validarMenuOpcion(menu_almuerzo_id, 'almuerzo'),
    validarMenuOpcion(menu_once_id, 'once')
  ]);

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
      con_menu: menuDesayunoId !== null || menuAlmuerzoId !== null || menuOnceId !== null,
      menu_desayuno_id: menuDesayunoId,
      menu_almuerzo_id: menuAlmuerzoId,
      menu_once_id: menuOnceId,
      cantidad_personas: cantidad_personas ? Number(cantidad_personas) : null,
      comentario: comentario ? String(comentario).trim() : '',
      estado: 'pendiente' // requiere confirmación manual del administrador
    }
  });
  return insertados[0];
}

async function listar({ estado } = {}) {
  let query = '/eventos?select=*,menu_desayuno:menu_opciones!menu_desayuno_id(nombre),menu_almuerzo:menu_opciones!menu_almuerzo_id(nombre),menu_once:menu_opciones!menu_once_id(nombre)&order=fecha.asc';
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

module.exports = {
  calendario,
  infoPublica,
  actualizarInfo,
  listarMenuOpciones,
  crearMenuOpcion,
  actualizarMenuOpcion,
  eliminarMenuOpcion,
  solicitar,
  listar,
  cambiarEstado
};
