const { pg } = require('./supabaseClient');

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Genera los bloques horarios fijos del día (por defecto 18:00-19:00, 19:10-20:10, ...).
// El buffer de cambio de equipo se agrega COMO PAUSA entre bloques (no dentro de
// la hora vendida): cada bloque dura duracion_bloque_min completos, pero el
// siguiente bloque recién puede empezar buffer_cambio_min después de que termina
// el anterior. Esto reduce la cantidad de horas vendibles por día frente a
// pegar los bloques uno tras otro sin pausa.
function generarBloques(config) {
  const inicio = toMinutes(config.hora_inicio_canchas);
  const fin = toMinutes(config.hora_fin_canchas);
  const dur = config.duracion_bloque_min;
  const buffer = config.buffer_cambio_min || 0;
  const paso = dur + buffer;
  const bloques = [];
  for (let t = inicio; t + dur <= fin; t += paso) {
    bloques.push({ hora_inicio: toHHMM(t), hora_fin: toHHMM(t + dur) });
  }
  return bloques;
}

function validarFecha(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !isNaN(Date.parse(fecha));
}

async function getConfig() {
  const filas = await pg('/config?id=eq.1&select=*');
  return filas[0];
}

// Disponibilidad de ambas canchas para una fecha dada.
async function disponibilidad(fecha) {
  if (!validarFecha(fecha)) {
    const err = new Error('Fecha inválida, use formato AAAA-MM-DD');
    err.status = 400;
    throw err;
  }
  const [config, canchas, reservasDelDia] = await Promise.all([
    getConfig(),
    pg('/canchas?select=*&order=id'),
    pg(`/reservas_cancha?fecha=eq.${fecha}&select=cancha_id,hora_inicio`)
  ]);
  const bloques = generarBloques(config);

  return canchas.map(cancha => {
    const horarios = bloques.map(b => {
      const ocupado = reservasDelDia.find(
        r => r.cancha_id === cancha.id && r.hora_inicio === b.hora_inicio
      );
      return {
        hora_inicio: b.hora_inicio,
        hora_fin: b.hora_fin,
        disponible: !ocupado
        // No exponemos datos del cliente en la vista pública, solo si está ocupado.
      };
    });
    return { cancha_id: cancha.id, nombre: cancha.nombre, horarios };
  });
}

// Reserva automática: si el bloque está libre, se confirma al instante.
async function reservar({ cancha_id, fecha, hora_inicio, nombre_cliente, telefono }) {
  if (!validarFecha(fecha)) {
    const err = new Error('Fecha inválida, use formato AAAA-MM-DD');
    err.status = 400;
    throw err;
  }
  if (!nombre_cliente || !telefono) {
    const err = new Error('Debe indicar nombre y teléfono de contacto');
    err.status = 400;
    throw err;
  }

  const [config, canchasEncontradas] = await Promise.all([
    getConfig(),
    pg(`/canchas?id=eq.${Number(cancha_id)}&select=*`)
  ]);
  const cancha = canchasEncontradas[0];
  if (!cancha) {
    const err = new Error('Cancha no encontrada');
    err.status = 404;
    throw err;
  }

  const bloques = generarBloques(config);
  const bloque = bloques.find(b => b.hora_inicio === hora_inicio);
  if (!bloque) {
    const err = new Error('Ese horario no existe dentro del rango de agendamiento (18:00 a 23:00)');
    err.status = 400;
    throw err;
  }

  const yaOcupado = await pg(
    `/reservas_cancha?cancha_id=eq.${cancha.id}&fecha=eq.${fecha}&hora_inicio=eq.${encodeURIComponent(hora_inicio)}&select=id`
  );
  if (yaOcupado.length > 0) {
    const err = new Error('Ese horario ya fue reservado por otra persona. Elige otro bloque disponible.');
    err.status = 409;
    throw err;
  }

  try {
    const insertadas = await pg('/reservas_cancha', {
      method: 'POST',
      body: {
        cancha_id: cancha.id,
        fecha,
        hora_inicio: bloque.hora_inicio,
        hora_fin: bloque.hora_fin,
        nombre_cliente: String(nombre_cliente).trim(),
        telefono: String(telefono).trim()
      }
    });
    return insertadas[0];
  } catch (err) {
    // Restricción única de la tabla: cubre el caso raro de dos reservas casi simultáneas.
    if (err.status === 409) {
      err.message = 'Ese horario ya fue reservado por otra persona. Elige otro bloque disponible.';
    }
    throw err;
  }
}

async function listarReservas({ desde, hasta } = {}) {
  let query = '/reservas_cancha?select=*&order=fecha.asc,hora_inicio.asc';
  if (desde) query += `&fecha=gte.${desde}`;
  if (hasta) query += `&fecha=lte.${hasta}`;
  return pg(query);
}

async function cancelarReserva(id) {
  const eliminadas = await pg(`/reservas_cancha?id=eq.${Number(id)}`, { method: 'DELETE' });
  if (!eliminadas || eliminadas.length === 0) {
    const err = new Error('Reserva no encontrada');
    err.status = 404;
    throw err;
  }
  return eliminadas[0];
}

module.exports = { disponibilidad, reservar, listarReservas, cancelarReserva, generarBloques };
