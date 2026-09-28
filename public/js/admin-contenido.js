// Panel de "Contenido": login aparte con Supabase Authentication (no usa
// admin_usuarios ni las cookies del panel de agenda). El token se guarda solo
// en sessionStorage (se pierde al cerrar la pestaña) y se manda como
// "Authorization: Bearer <token>" en cada llamada a /api/superadmin/*.

const seccionLogin = document.getElementById('seccion-login-contenido');
const seccionPanel = document.getElementById('seccion-panel-contenido');
const btnLogout = document.getElementById('btn-logout-contenido');
const mensajeDiv = document.getElementById('mensaje-contenido');

let supabaseUrl = null;
let supabaseAnonKey = null;

function mostrarMensaje(texto, tipo) {
  mensajeDiv.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
  setTimeout(() => { mensajeDiv.innerHTML = ''; }, 6000);
}

function getToken() {
  return sessionStorage.getItem('superadmin_token');
}

function setToken(token) {
  if (token) sessionStorage.setItem('superadmin_token', token);
  else sessionStorage.removeItem('superadmin_token');
}

async function llamarSuperadmin(ruta, opciones = {}) {
  const resp = await fetch(ruta, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(opciones.headers || {})
    }
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

async function cargarConfigPublica() {
  const resp = await fetch('/api/config-publica');
  const data = await resp.json();
  supabaseUrl = data.supabaseUrl;
  supabaseAnonKey = data.supabaseAnonKey;
}

async function mostrarPanelSiHaySesion() {
  if (!getToken()) {
    seccionLogin.classList.remove('oculto');
    seccionPanel.classList.add('oculto');
    btnLogout.classList.add('oculto');
    return;
  }
  seccionLogin.classList.add('oculto');
  seccionPanel.classList.remove('oculto');
  btnLogout.classList.remove('oculto');
  await Promise.all([cargarInfoEventos(), cargarMenuOpciones(), cargarConfigCanchas()]);
}

document.getElementById('form-login-contenido').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('ca-email').value;
  const password = document.getElementById('ca-password').value;
  try {
    await cargarConfigPublica();
    const resp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error_description || data.msg || 'No se pudo iniciar sesión');
    setToken(data.access_token);
    document.getElementById('ca-password').value = '';
    await mostrarPanelSiHaySesion();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

btnLogout.addEventListener('click', (e) => {
  e.preventDefault();
  setToken(null);
  mostrarPanelSiHaySesion();
});

// ---- Información del Centro de Eventos ----
async function cargarInfoEventos() {
  try {
    const data = await llamarSuperadmin('/api/superadmin/eventos-info');
    document.getElementById('ci-capacidad').value = data.capacidad || '';
    document.getElementById('ci-servicios').value = data.servicios || '';
    document.getElementById('ci-contacto').value = data.contacto || '';
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

document.getElementById('form-info-eventos').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await llamarSuperadmin('/api/superadmin/eventos-info', {
      method: 'PUT',
      body: JSON.stringify({
        capacidad: document.getElementById('ci-capacidad').value,
        servicios: document.getElementById('ci-servicios').value,
        contacto: document.getElementById('ci-contacto').value
      })
    });
    mostrarMensaje('Información actualizada.', 'exito');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

// ---- Precio de canchas ----
async function cargarConfigCanchas() {
  try {
    const config = await llamarSuperadmin('/api/superadmin/canchas-config');
    document.getElementById('cfg-valor-cancha').value = config.valor_cancha_hora;
    document.getElementById('cfg-abono-porcentaje').value = config.abono_porcentaje;
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

document.getElementById('form-config-canchas').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await llamarSuperadmin('/api/superadmin/canchas-config', {
      method: 'PUT',
      body: JSON.stringify({
        valor_cancha_hora: document.getElementById('cfg-valor-cancha').value,
        abono_porcentaje: document.getElementById('cfg-abono-porcentaje').value
      })
    });
    mostrarMensaje('Precio de canchas actualizado.', 'exito');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

// ---- Opciones de menú ----
function selectCategoria(valorActual) {
  return `
    <select data-campo="categoria">
      <option value="desayuno" ${valorActual === 'desayuno' ? 'selected' : ''}>Desayuno</option>
      <option value="tarde" ${valorActual === 'tarde' ? 'selected' : ''}>Tarde</option>
    </select>
  `;
}

async function cargarMenuOpciones() {
  const tbody = document.querySelector('#tabla-menu-opciones tbody');
  tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
  try {
    const lista = await llamarSuperadmin('/api/superadmin/menu-opciones');
    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No hay opciones de menú registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    lista.forEach(opcion => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" value="${opcion.nombre}" data-campo="nombre" style="min-width:200px;"></td>
        <td>${selectCategoria(opcion.categoria)}</td>
        <td><input type="number" value="${opcion.precio_por_persona ?? ''}" data-campo="precio_por_persona" min="0" style="width:120px;"></td>
        <td style="text-align:center;"><input type="checkbox" ${opcion.activo ? 'checked' : ''} data-campo="activo" style="width:auto;"></td>
        <td><input type="number" value="${opcion.orden}" data-campo="orden" style="width:70px;"></td>
        <td></td>
      `;
      const tdAcciones = tr.querySelector('td:last-child');

      const btnGuardar = document.createElement('button');
      btnGuardar.textContent = 'Guardar';
      btnGuardar.className = 'boton';
      btnGuardar.type = 'button';
      btnGuardar.style.marginRight = '0.4rem';
      btnGuardar.addEventListener('click', () => guardarOpcion(opcion.id, tr));

      const btnEliminar = document.createElement('button');
      btnEliminar.textContent = 'Eliminar';
      btnEliminar.className = 'boton secundario';
      btnEliminar.type = 'button';
      btnEliminar.addEventListener('click', () => eliminarOpcion(opcion.id));

      tdAcciones.appendChild(btnGuardar);
      tdAcciones.appendChild(btnEliminar);
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
  }
}

async function guardarOpcion(id, tr) {
  const nombre = tr.querySelector('[data-campo="nombre"]').value;
  const categoria = tr.querySelector('[data-campo="categoria"]').value;
  const precio = tr.querySelector('[data-campo="precio_por_persona"]').value;
  const activo = tr.querySelector('[data-campo="activo"]').checked;
  const orden = tr.querySelector('[data-campo="orden"]').value;
  try {
    await llamarSuperadmin(`/api/superadmin/menu-opciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nombre, categoria, precio_por_persona: precio === '' ? null : precio, activo, orden })
    });
    mostrarMensaje('Opción actualizada.', 'exito');
    cargarMenuOpciones();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

async function eliminarOpcion(id) {
  try {
    await llamarSuperadmin(`/api/superadmin/menu-opciones/${id}`, { method: 'DELETE' });
    mostrarMensaje('Opción eliminada.', 'exito');
    cargarMenuOpciones();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

document.getElementById('form-nueva-opcion').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await llamarSuperadmin('/api/superadmin/menu-opciones', {
      method: 'POST',
      body: JSON.stringify({
        nombre: document.getElementById('mo-nombre').value,
        categoria: document.getElementById('mo-categoria').value,
        precio_por_persona: document.getElementById('mo-precio').value || null
      })
    });
    document.getElementById('form-nueva-opcion').reset();
    mostrarMensaje('Opción agregada.', 'exito');
    cargarMenuOpciones();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

mostrarPanelSiHaySesion();
