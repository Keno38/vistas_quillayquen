const mensajeDiv = document.getElementById('mensaje-galeria');
const tabRecinto = document.getElementById('tab-recinto');
const tabEventos = document.getElementById('tab-eventos');
const vistaRecinto = document.getElementById('vista-recinto');
const vistaEventos = document.getElementById('vista-eventos');
const grillaRecinto = document.getElementById('grilla-recinto');
const listaAlbumes = document.getElementById('lista-albumes');
const grillaReels = document.getElementById('grilla-reels');

const NOMBRE_CUENTA = { vistas: 'Vistas Quillayquén', ferreteria: 'Ferretería PCY' };

const lightbox = document.getElementById('lightbox');
const lightboxContenido = document.getElementById('lightbox-contenido');

let itemsActivos = [];
let indiceActivo = -1;

function mostrarMensaje(texto, tipo) {
  mensajeDiv.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
}

function crearMiniatura(item, lista, indice) {
  const fig = document.createElement('figure');
  fig.className = 'miniatura';
  if (item.tipo === 'video') {
    const video = document.createElement('video');
    video.src = item.url;
    video.muted = true;
    video.preload = 'metadata';
    fig.appendChild(video);
    const marca = document.createElement('span');
    marca.className = 'marca-video';
    marca.textContent = '▶';
    fig.appendChild(marca);
  } else {
    const img = document.createElement('img');
    img.src = item.url;
    img.loading = 'lazy';
    img.alt = item.nombre;
    fig.appendChild(img);
  }
  fig.addEventListener('click', () => abrirLightbox(lista, indice));
  return fig;
}

function abrirLightbox(lista, indice) {
  itemsActivos = lista;
  indiceActivo = indice;
  renderLightbox();
  lightbox.classList.remove('oculto');
}

function renderLightbox() {
  const item = itemsActivos[indiceActivo];
  lightboxContenido.innerHTML = '';
  if (item.tipo === 'video') {
    const video = document.createElement('video');
    video.src = item.url;
    video.controls = true;
    video.autoplay = true;
    lightboxContenido.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.nombre;
    lightboxContenido.appendChild(img);
  }
}

function cerrarLightbox() {
  lightbox.classList.add('oculto');
  lightboxContenido.innerHTML = '';
}

document.getElementById('lightbox-cerrar').addEventListener('click', cerrarLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) cerrarLightbox(); });

document.getElementById('lightbox-anterior').addEventListener('click', () => {
  if (indiceActivo <= 0) return;
  indiceActivo--;
  renderLightbox();
});
document.getElementById('lightbox-siguiente').addEventListener('click', () => {
  if (indiceActivo >= itemsActivos.length - 1) return;
  indiceActivo++;
  renderLightbox();
});
document.addEventListener('keydown', (e) => {
  if (lightbox.classList.contains('oculto')) return;
  if (e.key === 'Escape') cerrarLightbox();
  if (e.key === 'ArrowLeft' && indiceActivo > 0) { indiceActivo--; renderLightbox(); }
  if (e.key === 'ArrowRight' && indiceActivo < itemsActivos.length - 1) { indiceActivo++; renderLightbox(); }
});

function renderRecinto(items) {
  grillaRecinto.innerHTML = '';
  if (items.length === 0) {
    grillaRecinto.innerHTML = '<p>Todavía no hay fotos ni videos del recinto cargados.</p>';
    return;
  }
  items.forEach((item, i) => grillaRecinto.appendChild(crearMiniatura(item, items, i)));
}

function renderEventos(albumes) {
  listaAlbumes.innerHTML = '';
  if (albumes.length === 0) {
    listaAlbumes.innerHTML = '<p>Todavía no hay álbumes de eventos cargados.</p>';
    return;
  }
  albumes.forEach(album => {
    const seccion = document.createElement('section');
    seccion.className = 'album-evento';
    const titulo = document.createElement('h3');
    titulo.textContent = `${album.nombre} (${album.items.length})`;
    seccion.appendChild(titulo);
    const grilla = document.createElement('div');
    grilla.className = 'grilla-galeria';
    album.items.forEach((item, i) => grilla.appendChild(crearMiniatura(item, album.items, i)));
    seccion.appendChild(grilla);
    listaAlbumes.appendChild(seccion);
  });
}

// ---- Reels (incrustados con el embed oficial de Instagram) ----
let scriptInstagramCargado = false;

function cargarScriptInstagram() {
  if (scriptInstagramCargado) {
    if (window.instgrm) window.instgrm.Embeds.process();
    return;
  }
  scriptInstagramCargado = true;
  const script = document.createElement('script');
  script.src = 'https://www.instagram.com/embed.js';
  script.async = true;
  document.body.appendChild(script);
}

let reelsCargados = [];
let cuentaReelActiva = 'vistas';

function renderReels() {
  const lista = reelsCargados.filter(r => r.cuenta === cuentaReelActiva);
  grillaReels.innerHTML = '';
  if (lista.length === 0) {
    grillaReels.innerHTML = `<p>Todavía no hay reels de ${NOMBRE_CUENTA[cuentaReelActiva]} cargados.</p>`;
    return;
  }
  lista.forEach(reel => {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-reel';
    tarjeta.innerHTML = `
      <span class="reel-cuenta">${reel.titulo || NOMBRE_CUENTA[reel.cuenta] || ''}</span>
      <blockquote class="instagram-media" data-instgrm-permalink="${reel.url}" data-instgrm-version="14"></blockquote>
    `;
    grillaReels.appendChild(tarjeta);
  });
  cargarScriptInstagram();
}

function activarTabReel(cuenta) {
  cuentaReelActiva = cuenta;
  document.getElementById('tab-reels-vistas').classList.toggle('secundario', cuenta !== 'vistas');
  document.getElementById('tab-reels-ferreteria').classList.toggle('secundario', cuenta !== 'ferreteria');
  renderReels();
}

document.getElementById('tab-reels-vistas').addEventListener('click', () => activarTabReel('vistas'));
document.getElementById('tab-reels-ferreteria').addEventListener('click', () => activarTabReel('ferreteria'));

function activarTab(tab) {
  tabRecinto.classList.toggle('secundario', tab !== 'recinto');
  tabEventos.classList.toggle('secundario', tab !== 'eventos');
  vistaRecinto.classList.toggle('oculto', tab !== 'recinto');
  vistaEventos.classList.toggle('oculto', tab !== 'eventos');
}

tabRecinto.addEventListener('click', () => activarTab('recinto'));
tabEventos.addEventListener('click', () => activarTab('eventos'));

async function cargarGaleria() {
  try {
    const resp = await fetch('/api/galeria');
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo cargar la galería');
    renderRecinto(data.recinto);
    renderEventos(data.eventos);
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

async function cargarReels() {
  try {
    const resp = await fetch('/api/reels');
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudieron cargar los reels');
    reelsCargados = data;
    renderReels();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

cargarGaleria();
cargarReels();
