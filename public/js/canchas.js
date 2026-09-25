const contenedorGrilla = document.getElementById('grilla');
const mensajeDiv = document.getElementById('mensaje-canchas');
const tituloMes = document.getElementById('titulo-mes');
const calendarioDiv = document.getElementById('calendario-canchas');
const fechaElegidaTexto = document.getElementById('fecha-elegida-canchas');

const barraContinuar = document.getElementById('barra-continuar');
const resumenSeleccion = document.getElementById('resumen-seleccion');
const btnContinuar = document.getElementById('btn-continuar-reserva');

const modal = document.getElementById('modal-reserva');
const formReserva = document.getElementById('form-reserva');
const zonaDrop = document.getElementById('zona-drop');
const inputComprobante = document.getElementById('r-comprobante');
const textoDrop = document.getElementById('texto-drop');

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

let configPago = null;
let seleccionActual = null; // { canchaId, nombreCancha, fecha, horaInicio, horaFin }

const hoy = new Date();
let anioActual = hoy.getFullYear();
let mesActual = hoy.getMonth() + 1; // 1-12
let fechaElegida = hoyISO();

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatoCLP(monto) {
  return Number(monto).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function formatoFechaLarga(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function mostrarMensaje(texto, tipo) {
  mensajeDiv.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
  setTimeout(() => { mensajeDiv.innerHTML = ''; }, 6000);
}

async function cargarConfigPago() {
  try {
    const resp = await fetch('/api/canchas/config');
    configPago = await resp.json();
    document.getElementById('texto-abono').textContent = `${configPago.abono_porcentaje}%`;
    document.getElementById('monto-abono').textContent = formatoCLP(configPago.monto_abono);
    document.getElementById('monto-completo').textContent = formatoCLP(configPago.monto_completo);
  } catch {
    // Si falla, igual se puede reservar; el monto exacto lo confirma el personal.
  }
}

// ---- Calendario (mismo look que el de Centro de Eventos, pero aquí cualquier
// día futuro se puede elegir: no hay estados de solicitud, solo navegación). ----
function renderCalendario() {
  tituloMes.textContent = `${NOMBRES_MES[mesActual - 1]} ${anioActual}`;
  calendarioDiv.innerHTML = '';

  DIAS_SEMANA.forEach(d => {
    const el = document.createElement('div');
    el.className = 'dia-semana';
    el.textContent = d;
    calendarioDiv.appendChild(el);
  });

  const primerDia = new Date(anioActual, mesActual - 1, 1);
  let offset = primerDia.getDay() - 1;
  if (offset < 0) offset = 6;
  for (let i = 0; i < offset; i++) {
    const vacio = document.createElement('div');
    vacio.className = 'dia vacio';
    calendarioDiv.appendChild(vacio);
  }

  const diasEnMes = new Date(anioActual, mesActual, 0).getDate();
  const hoyISOStr = hoyISO();

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = `${anioActual}-${String(mesActual).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const el = document.createElement('div');
    el.textContent = d;
    const esPasado = fecha < hoyISOStr;
    el.className = `dia ${esPasado ? 'vacio' : 'libre'}${fecha === fechaElegida ? ' seleccionado-canchas' : ''}`;
    if (!esPasado) {
      el.addEventListener('click', () => {
        fechaElegida = fecha;
        renderCalendario();
        cargarDisponibilidad();
      });
    }
    calendarioDiv.appendChild(el);
  }
}

document.getElementById('btn-mes-anterior').addEventListener('click', () => {
  mesActual--;
  if (mesActual < 1) { mesActual = 12; anioActual--; }
  renderCalendario();
});
document.getElementById('btn-mes-siguiente').addEventListener('click', () => {
  mesActual++;
  if (mesActual > 12) { mesActual = 1; anioActual++; }
  renderCalendario();
});

// ---- Disponibilidad y tarjetas de horario ----
const ETIQUETA_ESTADO = {
  disponible: 'Disponible',
  pendiente_verificacion: 'Pendiente',
  confirmada: 'Reservado'
};

async function cargarDisponibilidad() {
  fechaElegidaTexto.textContent = formatoFechaLarga(fechaElegida);
  contenedorGrilla.innerHTML = 'Cargando...';
  try {
    const resp = await fetch(`/api/canchas/disponibilidad?fecha=${fechaElegida}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error al cargar disponibilidad');
    renderGrilla(data);
    aplicarSeleccionDesdeURL(data);
  } catch (err) {
    contenedorGrilla.innerHTML = '';
    mostrarMensaje(err.message, 'error');
  }
}

function renderGrilla(canchasData) {
  contenedorGrilla.innerHTML = '';
  canchasData.forEach(cancha => {
    const col = document.createElement('div');
    col.className = 'cancha-columna';
    const h3 = document.createElement('h3');
    h3.textContent = cancha.nombre;
    col.appendChild(h3);

    cancha.horarios.forEach(h => {
      const estado = h.estado || (h.disponible ? 'disponible' : 'confirmada');
      const claseEstado = estado === 'pendiente_verificacion' ? 'pendiente' : estado === 'confirmada' ? 'reservado' : '';
      const div = document.createElement('div');
      div.className = `bloque-horario ${h.disponible ? 'disponible' : 'ocupado'} ${claseEstado}`.trim();
      div.dataset.canchaId = cancha.cancha_id;
      div.dataset.horaInicio = h.hora_inicio;
      div.innerHTML = `
        <span>${h.hora_inicio} - ${h.hora_fin}</span>
        <span class="estado-tag">${ETIQUETA_ESTADO[estado] || 'Reservado'}</span>
      `;
      if (h.disponible) {
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => seleccionarBloque(div, cancha.cancha_id, cancha.nombre, h.hora_inicio, h.hora_fin));
      }
      col.appendChild(div);
    });

    contenedorGrilla.appendChild(col);
  });
}

function seleccionarBloque(elemento, canchaId, nombreCancha, horaInicio, horaFin) {
  contenedorGrilla.querySelectorAll('.bloque-horario.seleccionado').forEach(el => el.classList.remove('seleccionado'));
  elemento.classList.add('seleccionado');
  seleccionActual = { canchaId, nombreCancha, fecha: fechaElegida, horaInicio, horaFin };
  resumenSeleccion.textContent = `${nombreCancha} · ${fechaElegida} · ${horaInicio} - ${horaFin}`;
  barraContinuar.classList.remove('oculto');
}

// Si venimos desde el link "Reservar" de la portada (?fecha=&hora=&cancha=),
// preseleccionamos ese bloque automáticamente.
function aplicarSeleccionDesdeURL(canchasData) {
  const params = new URLSearchParams(window.location.search);
  const canchaId = params.get('cancha');
  const hora = params.get('hora');
  if (!canchaId || !hora || seleccionActual) return;
  const el = contenedorGrilla.querySelector(
    `.bloque-horario.disponible[data-cancha-id="${canchaId}"][data-hora-inicio="${hora}"]`
  );
  if (el) el.click();
  history.replaceState(null, '', window.location.pathname);
}

btnContinuar.addEventListener('click', () => {
  if (!seleccionActual) return;
  document.getElementById('r-cancha-id').value = seleccionActual.canchaId;
  document.getElementById('r-fecha').value = seleccionActual.fecha;
  document.getElementById('r-hora').value = seleccionActual.horaInicio;
  document.getElementById('resumen-cancha').textContent = seleccionActual.nombreCancha;
  document.getElementById('resumen-fecha').textContent = formatoFechaLarga(seleccionActual.fecha);
  document.getElementById('resumen-horario').textContent = `${seleccionActual.horaInicio} - ${seleccionActual.horaFin}`;
  modal.classList.remove('oculto');
});

function cerrarModal() {
  modal.classList.add('oculto');
  formReserva.reset();
  textoDrop.textContent = 'Arrastra tu comprobante o haz clic para seleccionar el archivo';
  zonaDrop.classList.remove('con-archivo');
}
document.getElementById('btn-cancelar-modal').addEventListener('click', cerrarModal);

// ---- Arrastrar y soltar el comprobante ----
function actualizarNombreArchivo() {
  const archivo = inputComprobante.files[0];
  if (archivo) {
    textoDrop.textContent = `Archivo elegido: ${archivo.name}`;
    zonaDrop.classList.add('con-archivo');
  }
}
inputComprobante.addEventListener('change', actualizarNombreArchivo);

['dragenter', 'dragover'].forEach(evento => {
  zonaDrop.addEventListener(evento, (e) => {
    e.preventDefault();
    zonaDrop.classList.add('arrastrando');
  });
});
['dragleave', 'dragend', 'drop'].forEach(evento => {
  zonaDrop.addEventListener(evento, (e) => {
    e.preventDefault();
    zonaDrop.classList.remove('arrastrando');
  });
});
zonaDrop.addEventListener('drop', (e) => {
  const archivos = e.dataTransfer.files;
  if (archivos.length > 0) {
    inputComprobante.files = archivos;
    actualizarNombreArchivo();
  }
});

formReserva.addEventListener('submit', async (e) => {
  e.preventDefault();
  const archivo = inputComprobante.files[0];
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
  datos.append('correo_cliente', document.getElementById('r-correo').value);
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
    barraContinuar.classList.add('oculto');
    seleccionActual = null;
    mostrarMensaje(
      '¡Solicitud enviada! Tu horario queda apartado mientras verificamos el comprobante. Te confirmaremos a la brevedad.',
      'exito'
    );
    cargarDisponibilidad();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Confirmar reserva';
  }
});

// Si la URL trae ?fecha=, partimos mostrando ese mes/día.
(function inicializarFechaDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const fechaURL = params.get('fecha');
  if (fechaURL && /^\d{4}-\d{2}-\d{2}$/.test(fechaURL)) {
    fechaElegida = fechaURL;
    const [a, m] = fechaURL.split('-').map(Number);
    anioActual = a;
    mesActual = m;
  }
})();

renderCalendario();
cargarConfigPago();
cargarDisponibilidad();
