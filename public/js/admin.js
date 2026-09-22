const seccionLogin = document.getElementById('seccion-login');
const seccionPanel = document.getElementById('seccion-panel');
const btnLogout = document.getElementById('btn-logout');
const mensajeDiv = document.getElementById('mensaje-admin');

function mostrarMensaje(texto, tipo) {
  mensajeDiv.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
  setTimeout(() => { mensajeDiv.innerHTML = ''; }, 6000);
}

async function verificarSesion() {
  const resp = await fetch('/api/admin/sesion');
  const data = await resp.json();
  if (data.autenticado) {
    seccionLogin.classList.add('oculto');
    seccionPanel.classList.remove('oculto');
    btnLogout.classList.remove('oculto');
    cargarEventos();
    cargarCanchas();
  } else {
    seccionLogin.classList.remove('oculto');
    seccionPanel.classList.add('oculto');
    btnLogout.classList.add('oculto');
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

async function cargarEventos() {
  const tbody = document.querySelector('#tabla-eventos tbody');
  tbody.innerHTML = '<tr><td colspan="9">Cargando...</td></tr>';
  try {
    const resp = await fetch('/api/admin/eventos');
    const lista = await resp.json();
    if (!resp.ok) throw new Error(lista.error || 'Error al cargar solicitudes');
    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9">No hay solicitudes registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    lista.forEach(ev => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${ev.fecha}</td>
        <td>${ev.contacto_nombre}</td>
        <td>${ev.institucion || '-'}</td>
        <td>${ev.telefono}</td>
        <td>${ev.cantidad_personas ?? '-'}</td>
        <td>${ev.con_menu ? 'Sí (pollo, papas fritas y ensaladas)' : 'No'}</td>
        <td>${ev.comentario || '-'}</td>
        <td><span class="tag-estado ${ev.estado}">${ev.estado}</span></td>
        <td></td>
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

async function cargarCanchas() {
  const tbody = document.querySelector('#tabla-canchas tbody');
  tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
  const desde = document.getElementById('admin-desde').value;
  const hasta = document.getElementById('admin-hasta').value;
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  try {
    const resp = await fetch(`/api/admin/canchas/reservas?${params.toString()}`);
    const lista = await resp.json();
    if (!resp.ok) throw new Error(lista.error || 'Error al cargar reservas');
    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No hay reservas registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    lista.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.fecha}</td>
        <td>${r.hora_inicio} - ${r.hora_fin}</td>
        <td>Cancha ${r.cancha_id}</td>
        <td>${r.nombre_cliente}</td>
        <td>${r.telefono}</td>
        <td></td>
      `;
      const btnCancelar = document.createElement('button');
      btnCancelar.textContent = 'Cancelar reserva';
      btnCancelar.className = 'boton';
      btnCancelar.style.background = '#888';
      btnCancelar.addEventListener('click', () => cancelarReservaCancha(r.id));
      tr.querySelector('td:last-child').appendChild(btnCancelar);
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
  }
}

async function cancelarReservaCancha(id) {
  try {
    const resp = await fetch(`/api/admin/canchas/reservas/${id}`, { method: 'DELETE' });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo cancelar');
    mostrarMensaje('Reserva cancelada.', 'exito');
    cargarCanchas();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

document.getElementById('btn-filtrar-canchas').addEventListener('click', cargarCanchas);

verificarSesion();
