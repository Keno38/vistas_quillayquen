// Sección "Elige tu hora de juego" de la portada: consulta la disponibilidad
// real (misma API que usa /canchas.html), filtrada por el día elegido.

const inputFechaHome = document.getElementById('home-fecha');
const contBloquesHome = document.getElementById('home-bloques');
const mensajeHomeDiv = document.getElementById('home-mensaje');

function hoyISOHome() {
  return new Date().toISOString().slice(0, 10);
}

inputFechaHome.min = hoyISOHome();
inputFechaHome.value = hoyISOHome();

function mostrarMensajeHome(texto, tipo) {
  mensajeHomeDiv.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
  setTimeout(() => { mensajeHomeDiv.innerHTML = ''; }, 6000);
}

const ETIQUETA_CHIP = {
  disponible: { texto: 'Libre', clase: 'home-chip-libre' },
  pendiente_verificacion: { texto: 'Pendiente', clase: 'home-chip-pendiente' },
  confirmada: { texto: 'Reservado', clase: 'home-chip-reservado' }
};

function crearBloqueHome(cancha, horario, fecha) {
  const info = ETIQUETA_CHIP[horario.estado] || ETIQUETA_CHIP.confirmada;
  const art = document.createElement('article');
  art.className = `home-bloque${horario.disponible ? '' : ' home-bloque-ocupado'}`;

  const accionHTML = horario.disponible
    ? `<a href="/canchas.html?fecha=${fecha}&hora=${horario.hora_inicio}&cancha=${cancha.cancha_id}" class="home-bloque-boton home-bloque-boton-verde">Reservar</a>`
    : `<span class="home-bloque-boton home-bloque-boton-deshabilitado">${info.texto}</span>`;

  art.innerHTML = `
    <div class="home-bloque-top">
      <span class="home-bloque-hora">${horario.hora_inicio}</span>
      <span class="home-chip ${info.clase}">${info.texto}</span>
    </div>
    <p class="home-bloque-cancha">${cancha.nombre}</p>
    <p class="home-bloque-tipo">Pasto sintético</p>
    ${accionHTML}
  `;
  return art;
}

async function cargarDisponibilidadHome() {
  const fecha = inputFechaHome.value;
  if (!fecha) return;
  contBloquesHome.innerHTML = 'Cargando disponibilidad...';
  try {
    const resp = await fetch(`/api/canchas/disponibilidad?fecha=${fecha}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo cargar la disponibilidad');

    contBloquesHome.innerHTML = '';
    data.forEach(cancha => {
      cancha.horarios.forEach(horario => {
        contBloquesHome.appendChild(crearBloqueHome(cancha, horario, fecha));
      });
    });
    if (contBloquesHome.children.length === 0) {
      contBloquesHome.innerHTML = '<p>No hay bloques configurados para este día.</p>';
    }
  } catch (err) {
    contBloquesHome.innerHTML = '';
    mostrarMensajeHome(err.message, 'error');
  }
}

inputFechaHome.addEventListener('change', cargarDisponibilidadHome);
cargarDisponibilidadHome();
