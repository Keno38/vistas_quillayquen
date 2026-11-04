// Sección "Elige tu hora de juego" de la portada: consulta la disponibilidad
// real (misma API que usa /canchas.html), filtrada por el día elegido.

const inputFechaHome = document.getElementById('home-fecha');
const tarjetasCancha = document.querySelectorAll('[data-tarjeta-cancha]');
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
    ${accionHTML}
  `;
  return art;
}

async function cargarDisponibilidadHome() {
  const fecha = inputFechaHome.value;
  if (!fecha) return;
  tarjetasCancha.forEach(t => { t.querySelector('[data-grilla-cancha]').innerHTML = 'Cargando disponibilidad...'; });
  try {
    const resp = await fetch(`/api/canchas/disponibilidad?fecha=${fecha}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo cargar la disponibilidad');

    data.forEach((cancha, indice) => {
      const tarjeta = document.querySelector(`[data-tarjeta-cancha="${indice}"]`);
      if (!tarjeta) return;
      const nombreEl = tarjeta.querySelector('[data-campo-nombre]');
      if (nombreEl) nombreEl.textContent = cancha.nombre;
      const grilla = tarjeta.querySelector('[data-grilla-cancha]');
      grilla.innerHTML = '';
      cancha.horarios.forEach(horario => {
        grilla.appendChild(crearBloqueHome(cancha, horario, fecha));
      });
      if (grilla.children.length === 0) {
        grilla.innerHTML = '<p>No hay bloques configurados para este día.</p>';
      }
    });
  } catch (err) {
    tarjetasCancha.forEach(t => { t.querySelector('[data-grilla-cancha]').innerHTML = ''; });
    mostrarMensajeHome(err.message, 'error');
  }
}

inputFechaHome.addEventListener('change', cargarDisponibilidadHome);
cargarDisponibilidadHome();
