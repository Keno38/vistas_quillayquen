// Panel de "Contenido": usa la misma sesión (cookie admin_token) que
// /admin.html — un solo login para todo el sitio. Solo se puede ver si el
// usuario logueado tiene rol "general"; si no, se redirige a /admin.html.

const seccionPanel = document.getElementById('seccion-panel-contenido');
const btnLogout = document.getElementById('btn-logout-contenido');
const mensajeDiv = document.getElementById('mensaje-contenido');

function mostrarMensaje(texto, tipo) {
  mensajeDiv.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
  setTimeout(() => { mensajeDiv.innerHTML = ''; }, 6000);
}

async function llamarSuperadmin(ruta, opciones = {}) {
  const resp = await fetch(ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) }
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

// Igual que llamarSuperadmin, pero para subir archivos: el navegador arma el
// Content-Type con el boundary del multipart, así que no lo fijamos nosotros.
async function llamarSuperadminArchivo(ruta, formData, method = 'POST') {
  const resp = await fetch(ruta, { method, body: formData });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

async function mostrarPanelSiHaySesion() {
  const resp = await fetch('/api/admin/sesion');
  const data = await resp.json();
  if (!data.autenticado || data.rol !== 'general') {
    window.location.href = '/admin.html';
    return;
  }
  seccionPanel.classList.remove('oculto');
  btnLogout.classList.remove('oculto');
  await Promise.all([
    cargarInfoEventos(), cargarMenuOpciones(), cargarConfigCanchas(), cargarReels(),
    cargarHeroAdmin(), cargarGaleriaAdmin('recinto'), cargarGaleriaAdmin('eventos'), cargarUsuarios(),
    cargarConfigGeneral()
  ]);
}

btnLogout.addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin.html';
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
      <option value="almuerzo" ${valorActual === 'almuerzo' ? 'selected' : ''}>Almuerzo</option>
      <option value="once" ${valorActual === 'once' ? 'selected' : ''}>Once</option>
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

// ---- Reels de Instagram ----
const NOMBRE_CUENTA_REEL = { vistas: 'Vistas de Quillayquén', ferreteria: 'Ferretería PCY' };

function selectCuentaReel(valorActual) {
  return `
    <select data-campo="cuenta">
      <option value="vistas" ${valorActual === 'vistas' ? 'selected' : ''}>Vistas de Quillayquén</option>
      <option value="ferreteria" ${valorActual === 'ferreteria' ? 'selected' : ''}>Ferretería PCY</option>
    </select>
  `;
}

async function cargarReels() {
  const tbody = document.querySelector('#tabla-reels tbody');
  tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
  try {
    const lista = await llamarSuperadmin('/api/superadmin/reels');
    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No hay reels registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    lista.forEach(reel => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="url" value="${reel.url}" data-campo="url" style="min-width:220px;"></td>
        <td>${selectCuentaReel(reel.cuenta)}</td>
        <td><input type="text" value="${reel.titulo || ''}" data-campo="titulo" style="min-width:140px;"></td>
        <td style="text-align:center;"><input type="checkbox" ${reel.activo ? 'checked' : ''} data-campo="activo" style="width:auto;"></td>
        <td><input type="number" value="${reel.orden}" data-campo="orden" style="width:70px;"></td>
        <td></td>
      `;
      const tdAcciones = tr.querySelector('td:last-child');

      const btnGuardar = document.createElement('button');
      btnGuardar.textContent = 'Guardar';
      btnGuardar.className = 'boton';
      btnGuardar.type = 'button';
      btnGuardar.style.marginRight = '0.4rem';
      btnGuardar.addEventListener('click', () => guardarReel(reel.id, tr));

      const btnEliminar = document.createElement('button');
      btnEliminar.textContent = 'Eliminar';
      btnEliminar.className = 'boton secundario';
      btnEliminar.type = 'button';
      btnEliminar.addEventListener('click', () => eliminarReel(reel.id));

      tdAcciones.appendChild(btnGuardar);
      tdAcciones.appendChild(btnEliminar);
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
  }
}

async function guardarReel(id, tr) {
  const url = tr.querySelector('[data-campo="url"]').value;
  const cuenta = tr.querySelector('[data-campo="cuenta"]').value;
  const titulo = tr.querySelector('[data-campo="titulo"]').value;
  const activo = tr.querySelector('[data-campo="activo"]').checked;
  const orden = tr.querySelector('[data-campo="orden"]').value;
  try {
    await llamarSuperadmin(`/api/superadmin/reels/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ url, cuenta, titulo, activo, orden })
    });
    mostrarMensaje('Reel actualizado.', 'exito');
    cargarReels();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

async function eliminarReel(id) {
  try {
    await llamarSuperadmin(`/api/superadmin/reels/${id}`, { method: 'DELETE' });
    mostrarMensaje('Reel eliminado.', 'exito');
    cargarReels();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

document.getElementById('form-nuevo-reel').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await llamarSuperadmin('/api/superadmin/reels', {
      method: 'POST',
      body: JSON.stringify({
        url: document.getElementById('reel-url').value,
        cuenta: document.getElementById('reel-cuenta').value
      })
    });
    document.getElementById('form-nuevo-reel').reset();
    mostrarMensaje('Reel agregado.', 'exito');
    cargarReels();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

// ---- Imágenes de portada (Hero) ----
const NOMBRE_PAGINA_HERO = { index: 'Inicio', canchas: 'Reserva de canchas', eventos: 'Centro de Eventos' };

async function cargarHeroAdmin() {
  const cont = document.getElementById('grilla-hero-admin');
  cont.innerHTML = 'Cargando...';
  try {
    const data = await llamarSuperadmin('/api/superadmin/hero');
    cont.innerHTML = '';
    Object.keys(NOMBRE_PAGINA_HERO).forEach(pagina => {
      const tarjeta = document.createElement('div');
      tarjeta.className = 'hero-admin-tarjeta';
      tarjeta.innerHTML = `
        <h4>${NOMBRE_PAGINA_HERO[pagina]}</h4>
        ${data[pagina] ? `<img class="miniatura-hero" src="${data[pagina]}" alt="Hero de ${NOMBRE_PAGINA_HERO[pagina]}">` : '<div class="miniatura-hero" style="display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:#64756c;">Foto de muestra actual</div>'}
        <input type="file" accept="image/*" data-hero-input="${pagina}" style="margin-bottom:0.5rem;">
        <div style="display:flex;gap:0.5rem;">
          <button type="button" class="boton" data-hero-subir="${pagina}">Subir</button>
          ${data[pagina] ? `<button type="button" class="boton secundario" data-hero-quitar="${pagina}">Quitar</button>` : ''}
        </div>
      `;
      cont.appendChild(tarjeta);
    });
    cont.querySelectorAll('[data-hero-subir]').forEach(btn => {
      btn.addEventListener('click', () => subirHero(btn.getAttribute('data-hero-subir')));
    });
    cont.querySelectorAll('[data-hero-quitar]').forEach(btn => {
      btn.addEventListener('click', () => quitarHero(btn.getAttribute('data-hero-quitar')));
    });
  } catch (err) {
    cont.innerHTML = err.message;
  }
}

async function subirHero(pagina) {
  const input = document.querySelector(`[data-hero-input="${pagina}"]`);
  if (!input.files[0]) { mostrarMensaje('Elige una imagen primero.', 'error'); return; }
  const formData = new FormData();
  formData.append('archivo', input.files[0]);
  try {
    await llamarSuperadminArchivo(`/api/superadmin/hero/${pagina}`, formData);
    mostrarMensaje('Imagen de portada actualizada.', 'exito');
    cargarHeroAdmin();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

async function quitarHero(pagina) {
  try {
    await llamarSuperadmin(`/api/superadmin/hero/${pagina}`, { method: 'DELETE' });
    mostrarMensaje('Se volvió a la foto de muestra.', 'exito');
    cargarHeroAdmin();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

// ---- Galería de fotos (Recinto / Eventos) ----
async function cargarGaleriaAdmin(seccion) {
  const cont = document.getElementById(`grilla-galeria-${seccion}`);
  cont.innerHTML = 'Cargando...';
  try {
    const todos = await llamarSuperadmin('/api/superadmin/galeria');
    const items = todos.filter(i => i.seccion === seccion);
    if (items.length === 0) {
      cont.innerHTML = '<p>Todavía no hay fotos ni videos aquí.</p>';
      return;
    }
    cont.innerHTML = '';
    items.forEach(item => {
      const tarjeta = document.createElement('div');
      tarjeta.className = 'galeria-admin-tarjeta';
      const media = item.tipo_archivo === 'video'
        ? `<video src="${item.url}" muted></video>`
        : `<img src="${item.url}" alt="">`;
      tarjeta.innerHTML = `
        ${item.album ? `<span class="galeria-admin-album">${item.album}</span>` : ''}
        ${media}
        <button type="button" class="galeria-admin-borrar" title="Eliminar" data-galeria-borrar="${item.id}">&times;</button>
      `;
      cont.appendChild(tarjeta);
    });
    cont.querySelectorAll('[data-galeria-borrar]').forEach(btn => {
      btn.addEventListener('click', () => eliminarGaleriaItem(btn.getAttribute('data-galeria-borrar'), seccion));
    });
  } catch (err) {
    cont.innerHTML = err.message;
  }
}

async function eliminarGaleriaItem(id, seccion) {
  if (!confirm('¿Eliminar esta foto/video? No se puede deshacer.')) return;
  try {
    await llamarSuperadmin(`/api/superadmin/galeria/${id}`, { method: 'DELETE' });
    mostrarMensaje('Eliminado.', 'exito');
    cargarGaleriaAdmin(seccion);
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

document.getElementById('form-galeria-recinto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('galeria-recinto-archivo');
  if (!input.files[0]) return;
  const formData = new FormData();
  formData.append('seccion', 'recinto');
  formData.append('archivo', input.files[0]);
  try {
    await llamarSuperadminArchivo('/api/superadmin/galeria', formData);
    e.target.reset();
    mostrarMensaje('Foto/video agregado a Recinto.', 'exito');
    cargarGaleriaAdmin('recinto');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

document.getElementById('form-galeria-eventos').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('galeria-eventos-archivo');
  if (!input.files[0]) return;
  const formData = new FormData();
  formData.append('seccion', 'eventos');
  formData.append('album', document.getElementById('galeria-eventos-album').value);
  formData.append('archivo', input.files[0]);
  try {
    await llamarSuperadminArchivo('/api/superadmin/galeria', formData);
    e.target.reset();
    mostrarMensaje('Foto/video agregado a Eventos.', 'exito');
    cargarGaleriaAdmin('eventos');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

// ---- Correo de contacto y notificaciones ----
async function cargarConfigGeneral() {
  try {
    const data = await llamarSuperadmin('/api/superadmin/config-general');
    document.getElementById('cfg-correo-contacto').value = data.correo_contacto || '';
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

document.getElementById('form-config-general').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await llamarSuperadmin('/api/superadmin/config-general', {
      method: 'PUT',
      body: JSON.stringify({ correo_contacto: document.getElementById('cfg-correo-contacto').value })
    });
    mostrarMensaje('Correo de contacto actualizado.', 'exito');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

// ---- Usuarios y accesos ----
const NOMBRE_ROL = { agenda: 'Agenda (solo reservas)', general: 'General (todo)' };

async function cargarUsuarios() {
  const tbody = document.querySelector('#tabla-usuarios tbody');
  tbody.innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';
  try {
    const lista = await llamarSuperadmin('/api/superadmin/usuarios');
    tbody.innerHTML = '';
    lista.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.usuario}</td>
        <td>${NOMBRE_ROL[u.rol] || u.rol}</td>
        <td></td>
      `;
      const tdAcciones = tr.querySelector('td:last-child');

      const btnClave = document.createElement('button');
      btnClave.textContent = 'Cambiar clave';
      btnClave.className = 'boton secundario';
      btnClave.type = 'button';
      btnClave.style.marginRight = '0.4rem';
      btnClave.addEventListener('click', () => cambiarClaveUsuario(u.usuario));

      const btnEliminar = document.createElement('button');
      btnEliminar.textContent = 'Eliminar';
      btnEliminar.className = 'boton secundario';
      btnEliminar.type = 'button';
      btnEliminar.addEventListener('click', () => eliminarUsuario(u.usuario));

      tdAcciones.appendChild(btnClave);
      tdAcciones.appendChild(btnEliminar);
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3">${err.message}</td></tr>`;
  }
}

async function cambiarClaveUsuario(usuario) {
  const nueva = prompt(`Nueva contraseña para "${usuario}" (mínimo 6 caracteres):`);
  if (!nueva) return;
  try {
    await llamarSuperadmin(`/api/superadmin/usuarios/${encodeURIComponent(usuario)}`, {
      method: 'PUT',
      body: JSON.stringify({ password: nueva })
    });
    mostrarMensaje('Contraseña actualizada.', 'exito');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

async function eliminarUsuario(usuario) {
  if (!confirm(`¿Eliminar el usuario "${usuario}"? No se puede deshacer.`)) return;
  try {
    await llamarSuperadmin(`/api/superadmin/usuarios/${encodeURIComponent(usuario)}`, { method: 'DELETE' });
    mostrarMensaje('Usuario eliminado.', 'exito');
    cargarUsuarios();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

document.getElementById('form-nuevo-usuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await llamarSuperadmin('/api/superadmin/usuarios', {
      method: 'POST',
      body: JSON.stringify({
        usuario: document.getElementById('us-usuario').value,
        password: document.getElementById('us-password').value,
        rol: document.getElementById('us-rol').value
      })
    });
    e.target.reset();
    mostrarMensaje('Usuario creado.', 'exito');
    cargarUsuarios();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

mostrarPanelSiHaySesion();
