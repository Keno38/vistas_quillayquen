const tituloMes = document.getElementById('titulo-mes');
const calendarioDiv = document.getElementById('calendario');
const mensajeDiv = document.getElementById('mensaje-eventos');
const form = document.getElementById('form-evento');

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

const hoy = new Date();
let anioActual = hoy.getFullYear();
let mesActual = hoy.getMonth() + 1; // 1-12

function mesISO() {
  return `${anioActual}-${String(mesActual).padStart(2, '0')}`;
}

function mostrarMensaje(texto, tipo) {
  mensajeDiv.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
  setTimeout(() => { mensajeDiv.innerHTML = ''; }, 6000);
}

function formatoCLP(monto) {
  return Number(monto).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

// Carga la información editable (capacidad/servicios/contacto) y las opciones
// de menú activas. El menú solo aparece acá, en el formulario de solicitud,
// no como texto fijo en el resto de la página.
async function cargarInfoPublica() {
  try {
    const resp = await fetch('/api/eventos/info-publica');
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo cargar la información');

    document.getElementById('info-capacidad').textContent = data.capacidad || '';
    document.getElementById('info-servicios').textContent = data.servicios || '';
    document.getElementById('info-contacto').textContent = data.contacto || '';

    const selectsPorCategoria = {
      desayuno: document.getElementById('ev-menu-desayuno'),
      almuerzo: document.getElementById('ev-menu-almuerzo'),
      once: document.getElementById('ev-menu-once')
    };
    data.menu_opciones.forEach(opcion => {
      const precio = opcion.precio_por_persona ? ` (${formatoCLP(opcion.precio_por_persona)} p/p)` : '';
      const option = document.createElement('option');
      option.value = opcion.id;
      option.textContent = `${opcion.nombre}${precio}`;
      const select = selectsPorCategoria[opcion.categoria];
      if (select) select.appendChild(option);
    });
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

async function cargarCalendario() {
  tituloMes.textContent = `${NOMBRES_MES[mesActual - 1]} ${anioActual}`;
  calendarioDiv.innerHTML = 'Cargando...';
  try {
    const resp = await fetch(`/api/eventos/calendario?mes=${mesISO()}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error al cargar calendario');
    renderCalendario(data);
  } catch (err) {
    calendarioDiv.innerHTML = '';
    mostrarMensaje(err.message, 'error');
  }
}

function renderCalendario(data) {
  calendarioDiv.innerHTML = '';
  DIAS_SEMANA.forEach(d => {
    const el = document.createElement('div');
    el.className = 'dia-semana';
    el.textContent = d;
    calendarioDiv.appendChild(el);
  });

  // Día de la semana del primer día del mes (lunes=0 ... domingo=6)
  const primerDia = new Date(anioActual, mesActual - 1, 1);
  let offset = primerDia.getDay() - 1;
  if (offset < 0) offset = 6;

  for (let i = 0; i < offset; i++) {
    const vacio = document.createElement('div');
    vacio.className = 'dia vacio';
    calendarioDiv.appendChild(vacio);
  }

  data.dias.forEach(d => {
    const el = document.createElement('div');
    const numero = parseInt(d.fecha.split('-')[2], 10);
    el.className = `dia ${d.estado}`;
    el.textContent = numero;
    if (d.estado !== 'confirmado') {
      el.addEventListener('click', () => seleccionarFecha(d.fecha, el));
    }
    calendarioDiv.appendChild(el);
  });
}

let elementoSeleccionado = null;

function seleccionarFecha(fecha, el) {
  if (elementoSeleccionado) elementoSeleccionado.classList.remove('seleccionado');
  elementoSeleccionado = el;
  el.classList.add('seleccionado');
  document.getElementById('ev-fecha').value = fecha;
  document.getElementById('fecha-elegida-texto').textContent = fecha;
  form.classList.remove('oculto');
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('btn-cancelar-evento').addEventListener('click', () => {
  form.classList.add('oculto');
  form.reset();
  if (elementoSeleccionado) elementoSeleccionado.classList.remove('seleccionado');
});

document.getElementById('btn-mes-anterior').addEventListener('click', () => {
  mesActual--;
  if (mesActual < 1) { mesActual = 12; anioActual--; }
  form.classList.add('oculto');
  cargarCalendario();
});

document.getElementById('btn-mes-siguiente').addEventListener('click', () => {
  mesActual++;
  if (mesActual > 12) { mesActual = 1; anioActual++; }
  form.classList.add('oculto');
  cargarCalendario();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    fecha: document.getElementById('ev-fecha').value,
    contacto_nombre: document.getElementById('ev-contacto').value,
    institucion: document.getElementById('ev-institucion').value,
    telefono: document.getElementById('ev-telefono').value,
    correo_cliente: document.getElementById('ev-correo').value,
    cantidad_personas: document.getElementById('ev-personas').value,
    menu_desayuno_id: document.getElementById('ev-menu-desayuno').value || null,
    menu_almuerzo_id: document.getElementById('ev-menu-almuerzo').value || null,
    menu_once_id: document.getElementById('ev-menu-once').value || null,
    comentario: document.getElementById('ev-comentario').value
  };
  try {
    const resp = await fetch('/api/eventos/solicitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo enviar la solicitud');
    form.classList.add('oculto');
    form.reset();
    mostrarMensaje('¡Solicitud enviada! Te contactaremos para confirmar la reserva.', 'exito');
    cargarCalendario();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

cargarInfoPublica();
cargarCalendario();
