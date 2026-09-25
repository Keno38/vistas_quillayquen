const inputFecha = document.getElementById('fecha');
const grilla = document.getElementById('grilla');
const mensajeDiv = document.getElementById('mensaje-canchas');

const modal = document.getElementById('modal-reserva');
const formReserva = document.getElementById('form-reserva');

let configPago = null;

function hoyISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatoCLP(monto) {
  return monto.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

inputFecha.min = hoyISO();
inputFecha.value = hoyISO();

function mostrarMensaje(texto, tipo) {
  mensajeDiv.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
  setTimeout(() => { mensajeDiv.innerHTML = ''; }, 6000);
}

async function cargarConfigPago() {
  try {
    const resp = await fetch('/api/canchas/config');
    configPago = await resp.json();
    document.getElementById('texto-abono').textContent = `${configPago.abono_porcentaje}%`;
    document.getElementById('monto-abono').textContent = `(${formatoCLP(configPago.monto_abono)})`;
    document.getElementById('monto-completo').textContent = `(${formatoCLP(configPago.monto_completo)})`;
  } catch {
    // Si falla, igual se puede reservar; el monto exacto lo confirma el personal.
  }
}

async function cargarDisponibilidad() {
  const fecha = inputFecha.value;
  if (!fecha) return;
  grilla.innerHTML = 'Cargando...';
  try {
    const resp = await fetch(`/api/canchas/disponibilidad?fecha=${fecha}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error al cargar disponibilidad');
    renderGrilla(data, fecha);
  } catch (err) {
    grilla.innerHTML = '';
    mostrarMensaje(err.message, 'error');
  }
}

function renderGrilla(canchasData, fecha) {
  grilla.innerHTML = '';
  canchasData.forEach(cancha => {
    const col = document.createElement('div');
    col.className = 'cancha-columna';
    const h3 = document.createElement('h3');
    h3.textContent = cancha.nombre;
    col.appendChild(h3);

    cancha.horarios.forEach(h => {
      const div = document.createElement('div');
      div.className = `bloque-horario ${h.disponible ? 'disponible' : 'ocupado'}`;
      div.innerHTML = `
        <span>${h.hora_inicio} - ${h.hora_fin}</span>
        <span class="estado-tag">${h.disponible ? 'Disponible' : 'Ocupado'}</span>
      `;
      if (h.disponible) {
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => abrirModal(cancha.cancha_id, cancha.nombre, fecha, h.hora_inicio));
      }
      col.appendChild(div);
    });

    grilla.appendChild(col);
  });
}

function abrirModal(canchaId, nombreCancha, fecha, horaInicio) {
  document.getElementById('r-cancha-id').value = canchaId;
  document.getElementById('r-fecha').value = fecha;
  document.getElementById('r-hora').value = horaInicio;
  document.getElementById('modal-titulo').textContent =
    `Reservar ${nombreCancha} — ${fecha} a las ${horaInicio}`;
  modal.classList.remove('oculto');
}

function cerrarModal() {
  modal.classList.add('oculto');
  formReserva.reset();
}

document.getElementById('btn-cancelar-modal').addEventListener('click', cerrarModal);

formReserva.addEventListener('submit', async (e) => {
  e.preventDefault();
  const archivo = document.getElementById('r-comprobante').files[0];
  if (!archivo) {
    mostrarMensaje('Debes adjuntar el comprobante de la transferencia.', 'error');
    return;
  }

  const datos = new FormData();
  datos.append('cancha_id', document.getElementById('r-cancha-id').value);
  datos.append('fecha', document.getElementById('r-fecha').value);
  datos.append('hora_inicio', document.getElementById('r-hora').value);
  datos.append('nombre_cliente', document.getElementById('r-nombre').value);
  datos.append('telefono', document.getElementById('r-telefono').value);
  datos.append('tipo_pago', formReserva.querySelector('input[name="r-tipo-pago"]:checked').value);
  datos.append('comprobante', archivo);

  const btnEnviar = document.getElementById('btn-enviar-reserva');
  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';
  try {
    const resp = await fetch('/api/canchas/reservar', { method: 'POST', body: datos });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo reservar');
    cerrarModal();
    mostrarMensaje(
      '¡Solicitud enviada! Tu horario queda apartado mientras verificamos el comprobante. Te confirmaremos a la brevedad.',
      'exito'
    );
    cargarDisponibilidad();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar solicitud de reserva';
  }
});

inputFecha.addEventListener('change', cargarDisponibilidad);
cargarConfigPago();
cargarDisponibilidad();
