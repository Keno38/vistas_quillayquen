const seccionLogin = document.getElementById('seccion-login');
const seccionPanel = document.getElementById('seccion-panel');
const btnLogout = document.getElementById('btn-logout');
const mensajeDiv = document.getElementById('mensaje-admin');
const badgePendientes = document.getElementById('badge-pendientes');
const navLinkContenido = document.getElementById('nav-link-contenido');

function mostrarMensaje(texto, tipo) {
  mensajeDiv.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
  setTimeout(() => { mensajeDiv.innerHTML = ''; }, 6000);
}

function formatoCLP(monto) {
  if (monto === null || monto === undefined) return '-';
  return Number(monto).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

async function verificarSesion() {
  const resp = await fetch('/api/admin/sesion');
  const data = await resp.json();
  if (data.autenticado) {
    seccionLogin.classList.add('oculto');
    seccionPanel.classList.remove('oculto');
    btnLogout.classList.remove('oculto');
    navLinkContenido.classList.toggle('oculto', data.rol !== 'general');
    cargarEventos();
    cargarCanchas();
  } else {
    seccionLogin.classList.remove('oculto');
    seccionPanel.classList.add('oculto');
    btnLogout.classList.add('oculto');
    navLinkContenido.classList.add('oculto');
  }
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuario = document.getElementById('login-usuario').value;
  const password = document.getElementById('login-password').value;
  try {
    const resp = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password })
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
    verificarSesion();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

btnLogout.addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  verificarSesion();
});

let ultimosEventos = [];
let ultimasReservasCanchas = [];

function renderStatsAdmin() {
  const cont = document.getElementById('stats-admin');
  const hoy = new Date();
  const mesActualISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

  const eventosPendientes = ultimosEventos.filter(e => e.estado === 'pendiente').length;
  const canchasPendientes = ultimasReservasCanchas.filter(r => r.estado === 'pendiente_verificacion').length;
  const canchasConfirmadasMes = ultimasReservasCanchas.filter(
    r => r.estado === 'confirmada' && r.fecha.startsWith(mesActualISO)
  ).length;

  const tarjetas = [
    { numero: eventosPendientes, etiqueta: 'Solicitudes de eventos por revisar' },
    { numero: canchasPendientes, etiqueta: 'Reservas de cancha por revisar' },
    { numero: canchasConfirmadasMes, etiqueta: 'Reservas confirmadas este mes' }
  ];
  cont.innerHTML = tarjetas.map(t => `
    <div class="stat-tarjeta">
      <div class="stat-numero">${t.numero}</div>
      <div class="stat-etiqueta">${t.etiqueta}</div>
    </div>
  `).join('');
}

async function cargarEventos() {
  const tbody = document.querySelector('#tabla-eventos tbody');
  tbody.innerHTML = '<tr><td colspan="9">Cargando...</td></tr>';
  try {
    const resp = await fetch('/api/admin/eventos');
    const lista = await resp.json();
    if (!resp.ok) throw new Error(lista.error || 'Error al cargar solicitudes');
    ultimosEventos = lista;
    renderStatsAdmin();
    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9">No hay solicitudes registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    lista.forEach(ev => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Fecha">${ev.fecha}</td>
        <td data-label="Contacto">${ev.contacto_nombre}</td>
        <td data-label="Institución">${ev.institucion || '-'}</td>
        <td data-label="Teléfono">${ev.telefono}</td>
        <td data-label="Personas">${ev.cantidad_personas ?? '-'}</td>
        <td data-label="Menú">${[
          ev.menu_desayuno?.nombre && `Desayuno: ${ev.menu_desayuno.nombre}`,
          ev.menu_almuerzo?.nombre && `Almuerzo: ${ev.menu_almuerzo.nombre}`,
          ev.menu_once?.nombre && `Once: ${ev.menu_once.nombre}`
        ].filter(Boolean).join(' · ') || 'No'}</td>
        <td data-label="Comentario">${ev.comentario || '-'}</td>
        <td data-label="Estado"><span class="tag-estado ${ev.estado}">${ev.estado}</span></td>
        <td data-label="Acciones"></td>
      `;
      const tdAcciones = tr.querySelector('td:last-child');
      if (ev.estado === 'pendiente') {
        const btnConfirmar = document.createElement('button');
        btnConfirmar.textContent = 'Confirmar';
        btnConfirmar.className = 'boton';
        btnConfirmar.style.marginRight = '0.4rem';
        btnConfirmar.addEventListener('click', () => cambiarEstadoEvento(ev.id, 'confirmado'));

        const btnRechazar = document.createElement('button');
        btnRechazar.textContent = 'Rechazar';
        btnRechazar.className = 'boton';
        btnRechazar.style.background = '#888';
        btnRechazar.addEventListener('click', () => cambiarEstadoEvento(ev.id, 'rechazado'));

        tdAcciones.appendChild(btnConfirmar);
        tdAcciones.appendChild(btnRechazar);
      } else {
        tdAcciones.textContent = '—';
      }
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9">${err.message}</td></tr>`;
  }
}

async function cambiarEstadoEvento(id, estado) {
  try {
    const resp = await fetch(`/api/admin/eventos/${id}/estado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo actualizar');
    mostrarMensaje(`Solicitud marcada como ${estado}.`, 'exito');
    cargarEventos();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

const ETIQUETAS_ESTADO = {
  pendiente_verificacion: 'Pendiente de verificación',
  confirmada: 'Confirmada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada'
};

function actualizarBadgePendientes(lista) {
  const pendientes = lista.filter(r => r.estado === 'pendiente_verificacion').length;
  if (pendientes > 0) {
    badgePendientes.textContent = `${pendientes} por revisar`;
    badgePendientes.className = 'tag-estado pendiente';
    badgePendientes.classList.remove('oculto');
  } else {
    badgePendientes.classList.add('oculto');
  }
}

async function cargarCanchas() {
  const tbody = document.querySelector('#tabla-canchas tbody');
  tbody.innerHTML = '<tr><td colspan="10">Cargando...</td></tr>';
  const desde = document.getElementById('admin-desde').value;
  const hasta = document.getElementById('admin-hasta').value;
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  try {
    const resp = await fetch(`/api/admin/canchas/reservas?${params.toString()}`);
    const lista = await resp.json();
    if (!resp.ok) throw new Error(lista.error || 'Error al cargar reservas');
    actualizarBadgePendientes(lista);
    ultimasReservasCanchas = lista;
    renderStatsAdmin();
    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10">No hay reservas registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    lista.forEach(r => {
      const tr = document.createElement('tr');
      const estadoTexto = ETIQUETAS_ESTADO[r.estado] || r.estado;
      const claseEstado = r.estado === 'confirmada' ? 'confirmado'
        : r.estado === 'pendiente_verificacion' ? 'pendiente' : 'rechazado';
      tr.innerHTML = `
        <td data-label="Fecha">${r.fecha}</td>
        <td data-label="Hora">${r.hora_inicio} - ${r.hora_fin}</td>
        <td data-label="Cancha">Cancha ${r.cancha_id}</td>
        <td data-label="Cliente">${r.nombre_cliente}</td>
        <td data-label="Teléfono">${r.telefono}</td>
        <td data-label="Pago">${r.tipo_pago === 'completo' ? 'Total' : 'Abono'}</td>
        <td data-label="Monto">${formatoCLP(r.monto_esperado)}</td>
        <td data-label="Comprobante"></td>
        <td data-label="Estado"><span class="tag-estado ${claseEstado}">${estadoTexto}</span>${r.motivo ? `<br><small>${r.motivo}</small>` : ''}</td>
        <td data-label="Acciones"></td>
      `;

      const tdComprobante = tr.children[7];
      if (r.comprobante_path) {
        const btnVer = document.createElement('button');
        btnVer.textContent = 'Ver';
        btnVer.className = 'boton secundario';
        btnVer.addEventListener('click', () => window.open(`/api/admin/canchas/reservas/${r.id}/comprobante`, '_blank'));
        tdComprobante.appendChild(btnVer);
      } else {
        tdComprobante.textContent = '-';
      }

      const tdAcciones = tr.children[9];
      if (r.estado === 'pendiente_verificacion') {
        const btnConfirmar = document.createElement('button');
        btnConfirmar.textContent = 'Confirmar';
        btnConfirmar.className = 'boton';
        btnConfirmar.style.marginRight = '0.4rem';
        btnConfirmar.addEventListener('click', () => confirmarReservaCancha(r.id));

        const btnRechazar = document.createElement('button');
        btnRechazar.textContent = 'Rechazar';
        btnRechazar.className = 'boton';
        btnRechazar.style.background = '#888';
        btnRechazar.addEventListener('click', () => rechazarReservaCancha(r.id));

        tdAcciones.appendChild(btnConfirmar);
        tdAcciones.appendChild(btnRechazar);
      } else if (r.estado === 'confirmada') {
        const btnCancelar = document.createElement('button');
        btnCancelar.textContent = 'Cancelar (reintegro)';
        btnCancelar.className = 'boton';
        btnCancelar.style.background = '#888';
        btnCancelar.addEventListener('click', () => cancelarReservaCancha(r.id));
        tdAcciones.appendChild(btnCancelar);
      } else {
        tdAcciones.textContent = '—';
      }

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10">${err.message}</td></tr>`;
  }
}

async function confirmarReservaCancha(id) {
  try {
    const resp = await fetch(`/api/admin/canchas/reservas/${id}/confirmar`, { method: 'POST' });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo confirmar');
    mostrarMensaje('Reserva confirmada.', 'exito');
    cargarCanchas();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

async function rechazarReservaCancha(id) {
  const motivo = prompt('¿Por qué se rechaza? (ej. "comprobante inválido")', 'Comprobante inválido') || undefined;
  try {
    const resp = await fetch(`/api/admin/canchas/reservas/${id}/rechazar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo rechazar');
    mostrarMensaje('Reserva rechazada. El horario quedó libre.', 'exito');
    cargarCanchas();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

async function cancelarReservaCancha(id) {
  const motivo = prompt('Motivo de la cancelación (para el registro):', 'Cliente avisó con anticipación') || undefined;
  try {
    const resp = await fetch(`/api/admin/canchas/reservas/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo cancelar');
    mostrarMensaje('Reserva cancelada. Recuerda hacer el reintegro por transferencia si corresponde.', 'exito');
    cargarCanchas();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

document.getElementById('btn-filtrar-canchas').addEventListener('click', cargarCanchas);

verificarSesion();
