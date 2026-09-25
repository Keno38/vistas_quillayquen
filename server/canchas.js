const { pg } = require('./supabaseClient');
const { subirComprobante, descargarComprobante } = require('./storage');

// Estados que "ocupan" el horario (bloquean el bloque para otras personas).
const ESTADOS_ACTIVOS = ['pendiente_verificacion', 'confirmada'];

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

async function actualizarConfig({ valor_cancha_hora, abono_porcentaje }) {
  const cambios = {};
  if (valor_cancha_hora !== undefined) {
    const valor = Number(valor_cancha_hora);
    if (!Number.isFinite(valor) || valor <= 0) {
      const err = new Error('El valor de la cancha debe ser un número mayor a 0');
      err.status = 400;
      throw err;
    }
    cambios.valor_cancha_hora = valor;
  }
  if (abono_porcentaje !== undefined) {
    const porcentaje = Number(abono_porcentaje);
    if (!Number.isFinite(porcentaje) || porcentaje < 1 || porcentaje > 100) {
      const err = new Error('El porcentaje de abono debe estar entre 1 y 100');
      err.status = 400;
      throw err;
    }
    cambios.abono_porcentaje = porcentaje;
  }
  if (Object.keys(cambios).length === 0) return getConfig();
  const actualizados = await pg('/config?id=eq.1', { method: 'PATCH', body: cambios });
  return actualizados[0];
}

// Disponibilidad de ambas canchas para una fecha dada.
async function disponibilidad(fecha) {
  if (!validarFecha(fecha)) {
    const err = new Error('Fecha inválida, use formato AAAA-MM-DD');
    err.status = 400;
    throw err;
  }
  const estadosFiltro = ESTADOS_ACTIVOS.join(',');
  const [config, canchas, reservasDelDia] = await Promise.all([
    getConfig(),
    pg('/canchas?select=*&order=id'),
    pg(`/reservas_cancha?fecha=eq.${fecha}&estado=in.(${estadosFiltro})&select=cancha_id,hora_inicio,estado`)
  ]);
  const bloques = generarBloques(config);

  return canchas.map(cancha => {
    const horarios = bloques.map(b => {
      const reserva = reservasDelDia.find(
        r => r.cancha_id === cancha.id && r.hora_inicio === b.hora_inicio
      );
      // "estado" público del bloque: 'disponible', 'pendiente_verificacion'
      // (alguien lo reservó y está por confirmarse) o 'confirmada'. No exponemos
      // datos del cliente en la vista pública, solo este estado.
      return {
        hora_inicio: b.hora_inicio,
        hora_fin: b.hora_fin,
        disponible: !reserva,
        estado: reserva ? reserva.estado : 'disponible'
      };
    });
    return { cancha_id: cancha.id, nombre: cancha.nombre, horarios };
  });
}

function calcularMonto(config, tipoPago) {
  if (tipoPago === 'completo') return config.valor_cancha_hora;
  return Math.round((config.valor_cancha_hora * config.abono_porcentaje) / 100);
}

// Reserva con pago por transferencia: queda "pendiente_verificacion" (el horario
// ya se bloquea para otros) hasta que el personal revise el comprobante desde el
// panel de administración y la confirme o la rechace.
async function reservar({ cancha_id, fecha, hora_inicio, nombre_cliente, telefono, correo_cliente, tipo_pago }, comprobante) {
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
  if (!['abono', 'completo'].includes(tipo_pago)) {
    const err = new Error('Debe indicar si el pago es un abono o el monto completo');
    err.status = 400;
    throw err;
  }
  if (!comprobante) {
    const err = new Error('Debe adjuntar el comprobante de la transferencia');
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

  const estadosFiltro = ESTADOS_ACTIVOS.join(',');
  const yaOcupado = await pg(
    `/reservas_cancha?cancha_id=eq.${cancha.id}&fecha=eq.${fecha}&hora_inicio=eq.${encodeURIComponent(hora_inicio)}&estado=in.(${estadosFiltro})&select=id`
  );
  if (yaOcupado.length > 0) {
    const err = new Error('Ese horario ya fue reservado por otra persona. Elige otro bloque disponible.');
    err.status = 409;
    throw err;
  }

  const comprobantePath = await subirComprobante(comprobante.filename, comprobante.data, comprobante.contentType);

  try {
    const insertadas = await pg('/reservas_cancha', {
      method: 'POST',
      body: {
        cancha_id: cancha.id,
        fecha,
        hora_inicio: bloque.hora_inicio,
        hora_fin: bloque.hora_fin,
        nombre_cliente: String(nombre_cliente).trim(),
        telefono: String(telefono).trim(),
        correo_cliente: correo_cliente ? String(correo_cliente).trim() : null,
        tipo_pago,
        monto_esperado: calcularMonto(config, tipo_pago),
        comprobante_path: comprobantePath,
        estado: 'pendiente_verificacion'
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

async function obtenerReserva(id) {
  const filas = await pg(`/reservas_cancha?id=eq.${Number(id)}&select=*`);
  if (!filas[0]) {
    const err = new Error('Reserva no encontrada');
    err.status = 404;
    throw err;
  }
  return filas[0];
}

// El personal revisó el comprobante y es válido: la reserva queda confirmada.
async function confirmarReserva(id) {
  await obtenerReserva(id);
  const actualizadas = await pg(`/reservas_cancha?id=eq.${Number(id)}`, {
    method: 'PATCH',
    body: { estado: 'confirmada' }
  });
  return actualizadas[0];
}

// El comprobante no es válido (o no llegó la transferencia): se rechaza y el
// horario queda libre automáticamente para que otra persona lo reserve.
async function rechazarReserva(id, motivo) {
  await obtenerReserva(id);
  const actualizadas = await pg(`/reservas_cancha?id=eq.${Number(id)}`, {
    method: 'PATCH',
    body: { estado: 'rechazada', motivo: motivo ? String(motivo).trim() : 'Comprobante inválido' }
  });
  return actualizadas[0];
}

// Cancelación manual (ej. el cliente avisó con más de 2 horas de anticipación
// que no puede ir y corresponde reintegrarle el dinero). El reintegro en sí lo
// hace el personal por transferencia; aquí solo se libera el horario y queda
// registro de la cancelación.
async function cancelarReserva(id, motivo) {
  await obtenerReserva(id);
  const actualizadas = await pg(`/reservas_cancha?id=eq.${Number(id)}`, {
    method: 'PATCH',
    body: { estado: 'cancelada', motivo: motivo ? String(motivo).trim() : 'Cancelada por el cliente' }
  });
  return actualizadas[0];
}

async function obtenerArchivoComprobante(id) {
  const reserva = await obtenerReserva(id);
  if (!reserva.comprobante_path) {
    const err = new Error('Esta reserva no tiene comprobante adjunto');
    err.status = 404;
    throw err;
  }
  return descargarComprobante(reserva.comprobante_path);
}

module.exports = {
  disponibilidad,
  reservar,
  listarReservas,
  confirmarReserva,
  rechazarReserva,
  cancelarReserva,
  obtenerArchivoComprobante,
  getConfig,
  actualizarConfig,
  generarBloques
};
