const inputFecha = document.getElementById('fecha');
const grilla = document.getElementById('grilla');
const mensajeDiv = document.getElementById('mensaje-canchas');

const modal = document.getElementById('modal-reserva');
const formReserva = document.getElementById('form-reserva');

function hoyISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

inputFecha.min = hoyISO();
inputFecha.value = hoyISO();

function mostrarMensaje(texto, tipo) {
  mensajeDiv.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
  setTimeout(() => { mensajeDiv.innerHTML = ''; }, 6000);
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
  const payload = {
    cancha_id: document.getElementById('r-cancha-id').value,
    fecha: document.getElementById('r-fecha').value,
    hora_inicio: document.getElementById('r-hora').value,
    nombre_cliente: document.getElementById('r-nombre').value,
    telefono: document.getElementById('r-telefono').value
  };
  try {
    const resp = await fetch('/api/canchas/reservar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo reservar');
    cerrarModal();
    mostrarMensaje('¡Reserva confirmada! Te esperamos en la cancha.', 'exito');
    cargarDisponibilidad();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

inputFecha.addEventListener('change', cargarDisponibilidad);
cargarDisponibilidad();
