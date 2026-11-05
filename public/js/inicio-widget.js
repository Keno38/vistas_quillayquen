// Widget "Reserva tu cancha en 1 minuto" de la portada: elige fecha, cancha y
// hora usando la misma API que /canchas.html, y al confirmar lleva directo a
// /canchas.html con esos datos para terminar el pago ahí (reutiliza el flujo
// de reserva ya construido, en vez de duplicar el formulario y la subida del
// comprobante).
(function () {
  const inputFecha = document.getElementById('widget-fecha');
  const selectCancha = document.getElementById('widget-cancha');
  const contHoras = document.getElementById('widget-horas');
  const btnConfirmar = document.getElementById('widget-confirmar');
  if (!inputFecha || !selectCancha) return;

  function hoyISO() {
    return new Date().toISOString().slice(0, 10);
  }

  inputFecha.min = hoyISO();
  inputFecha.value = hoyISO();

  let datosDia = [];
  let horaElegida = null;

  function actualizarConfirmar() {
    const canchaId = selectCancha.value;
    if (canchaId && horaElegida) {
      btnConfirmar.href = `/canchas.html?fecha=${inputFecha.value}&hora=${horaElegida}&cancha=${canchaId}`;
    } else {
      btnConfirmar.href = '/canchas.html';
    }
  }

  function renderHoras() {
    const cancha = datosDia.find(c => String(c.cancha_id) === selectCancha.value);
    horaElegida = null;
    contHoras.innerHTML = '';
    if (!cancha) {
      contHoras.textContent = 'Elige una cancha';
      actualizarConfirmar();
      return;
    }
    if (cancha.horarios.length === 0) {
      contHoras.textContent = 'No hay horarios configurados para este día.';
      actualizarConfirmar();
      return;
    }
    cancha.horarios.forEach(horario => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = horario.hora_inicio;
      btn.className = `home-widget-hora-btn${horario.disponible ? '' : ' ocupado'}`;
      btn.disabled = !horario.disponible;
      btn.addEventListener('click', () => {
        contHoras.querySelectorAll('.home-widget-hora-btn').forEach(b => b.classList.remove('elegido'));
        btn.classList.add('elegido');
        horaElegida = horario.hora_inicio;
        actualizarConfirmar();
      });
      contHoras.appendChild(btn);
    });
    actualizarConfirmar();
  }

  async function cargarDia() {
    contHoras.innerHTML = 'Cargando...';
    try {
      const resp = await fetch(`/api/canchas/disponibilidad?fecha=${inputFecha.value}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No se pudo cargar la disponibilidad');
      datosDia = data;
      const canchaPrevia = selectCancha.value;
      selectCancha.innerHTML = '';
      data.forEach(cancha => {
        const opt = document.createElement('option');
        opt.value = cancha.cancha_id;
        opt.textContent = cancha.nombre;
        selectCancha.appendChild(opt);
      });
      if (canchaPrevia && data.some(c => String(c.cancha_id) === canchaPrevia)) {
        selectCancha.value = canchaPrevia;
      }
      renderHoras();
    } catch (err) {
      contHoras.textContent = 'No se pudo cargar la disponibilidad.';
      actualizarConfirmar();
    }
  }

  inputFecha.addEventListener('change', cargarDia);
  selectCancha.addEventListener('change', renderHoras);
  cargarDia();
})();
