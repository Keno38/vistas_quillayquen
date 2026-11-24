const PUNTOS = [
  {
    categoria: 'cancha', x: 76.3, y: 49.6,
    titulo: 'Canchas de pasto sintético',
    desc: 'Dos canchas de pasto sintético con iluminación nocturna y estacionamiento junto a la cancha.',
    fotos: [
      { src: '/img/cancha-1.jpg', alt: 'Cancha de pasto sintético' },
      { src: '/img/cancha-2.jpg', alt: 'Cancha de pasto sintético, vista general' },
    ],
    ctaTexto: 'Reservar cancha', ctaHref: '/canchas.html',
    precio: 'cancha',
  },
  {
    categoria: 'piscina', x: 34.4, y: 48.3,
    titulo: 'Piscina',
    desc: 'Piscina con áreas de descanso y sombra, abierta todos los días de 10:00 a 20:00 hrs.',
    fotos: [
      { src: '/img/piscina-1.jpg', alt: 'Piscina y reja de seguridad' },
      { src: '/img/piscina-2.jpg', alt: 'Piscina y zona de clavados' },
      { hero: 'piscina', alt: 'Piscina' },
    ],
    ctaTexto: 'Ver piscina', ctaHref: '/piscina.html',
    precio: 'Valor por persona — consulta las tarifas vigentes en el Centro de Eventos.',
  },
  {
    categoria: 'quinchos', x: 10.3, y: 72,
    titulo: 'Quinchos y zona de asados (sector bajo)',
    desc: 'Áreas verdes y quinchos con lavaplatos y mesas, para días de asado en familia.',
    fotos: [
      { src: '/img/quinchos-1.jpg', alt: 'Quincho con lavaplatos y mesa de picnic' },
      { src: '/img/quinchos-2.jpg', alt: 'Detalle del quincho y lavaplatos' },
      { src: '/img/quinchos-3.jpg', alt: 'Mesa de picnic bajo quincho techado' },
    ],
    ctaTexto: 'Ver piscina', ctaHref: '/piscina.html',
    precio: '',
  },
  {
    categoria: 'quinchos', x: 20.6, y: 22.2,
    titulo: 'Quinchos y zona de asados (sector alto)',
    desc: 'Áreas verdes y quinchos con lavaplatos y mesas, para días de asado en familia.',
    fotos: [
      { src: '/img/quinchos-1.jpg', alt: 'Quincho con lavaplatos y mesa de picnic' },
      { src: '/img/quinchos-2.jpg', alt: 'Detalle del quincho y lavaplatos' },
      { src: '/img/quinchos-3.jpg', alt: 'Mesa de picnic bajo quincho techado' },
    ],
    ctaTexto: 'Ver piscina', ctaHref: '/piscina.html',
    precio: '',
  },
  {
    categoria: 'juegos', x: 6.5, y: 44.7,
    titulo: 'Zona de juegos',
    desc: 'Área de juegos para los más pequeños dentro del recinto.',
    fotos: [
      { src: '/img/juegos-1.jpg', alt: 'Juegos infantiles: resbalín y columpios' },
      { src: '/img/juegos-2.jpg', alt: 'Columpios bajo la palmera' },
    ],
    ctaTexto: 'Ver piscina', ctaHref: '/piscina.html',
    precio: '',
  },
  {
    categoria: 'acceso', x: 51.1, y: 88.2,
    titulo: 'Acceso principal',
    desc: 'Entrada principal al recinto Vistas de Quillayquén.',
    fotos: [
      { src: '/img/acceso-letrero-1.jpg', alt: 'Letrero de acceso Vistas de Quillayquén' },
      { src: '/img/acceso-letrero-2.jpg', alt: 'Letrero de acceso Vistas de Quillayquén' },
    ],
    ctaTexto: 'Cómo llegar', ctaHref: '/index.html',
    precio: '',
  },
  {
    categoria: 'ferreteria', x: 94.5, y: 33.7,
    titulo: 'Ferretería PCY (vecino)',
    desc: 'Nuestra vecina de confianza: materiales, herramientas y fierro en Av. Quillayquén, al lado del recinto.',
    fotos: [
      { src: '/img/logo-ferreteria-pcy.png', alt: 'Ferretería PCY' },
    ],
    ctaTexto: 'Visitar ferreteriapcy.cl', ctaHref: 'https://ferreteriapcy.cl',
    precio: '',
  },
];

const COLORES = { cancha: '#2ecc71', piscina: '#f1c40f', quinchos: '#e74c3c', juegos: '#3498db', acceso: '#00bcd4', ferreteria: '#1a1a1a' };

const contenedorPines = document.getElementById('mapa-pines');
const overlay = document.getElementById('mapa-overlay');
const popup = document.getElementById('mapa-popup');
const popupFotos = document.getElementById('mapa-popup-fotos');
const popupTitulo = document.getElementById('mapa-popup-titulo');
const popupDesc = document.getElementById('mapa-popup-desc');
const popupPrecio = document.getElementById('mapa-popup-precio');
const popupCta = document.getElementById('mapa-popup-cta');
const contador = document.getElementById('mapa-contador');
const botonAnterior = document.getElementById('mapa-anterior');
const botonSiguiente = document.getElementById('mapa-siguiente');

if (contador) {
  contador.textContent = `${PUNTOS.length} zonas para explorar`;
}

let indiceActual = 0;

let configPagoCanchas = null;

async function cargarPrecioCancha() {
  try {
    const resp = await fetch('/api/canchas/config');
    configPagoCanchas = await resp.json();
  } catch {
    // Si falla, el popup de cancha no muestra el valor exacto.
  }
}

function formatoCLP(monto) {
  return Number(monto).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function textoPrecioCancha() {
  if (configPagoCanchas && configPagoCanchas.monto_completo) {
    return `Valor por hora: ${formatoCLP(configPagoCanchas.monto_completo)} (abono de ${formatoCLP(configPagoCanchas.monto_abono)} para reservar)`;
  }
  return 'El valor por hora se confirma al reservar.';
}

async function cargarFotosHero(fotos, contenedor) {
  if (fotos.length === 0) return;

  const fijas = fotos.filter(f => f.src);
  fijas.forEach(f => {
    const img = document.createElement('img');
    img.src = f.src;
    img.alt = f.alt;
    contenedor.appendChild(img);
  });

  const dinamicas = fotos.filter(f => f.hero);
  if (dinamicas.length === 0) return;
  let data = {};
  try {
    const resp = await fetch('/api/hero-publico');
    data = await resp.json();
  } catch {
    // Sin conexión a la API: se omiten las fotos.
  }
  dinamicas.forEach(f => {
    if (data && data[f.hero]) {
      const img = document.createElement('img');
      img.src = data[f.hero];
      img.alt = f.alt;
      contenedor.appendChild(img);
    }
  });
}

function abrirPopup(punto, indice) {
  indiceActual = indice;
  popupTitulo.textContent = punto.titulo;
  popupDesc.textContent = punto.desc;
  popupFotos.innerHTML = '';
  popupCta.textContent = punto.ctaTexto;
  popupCta.href = punto.ctaHref;
  const esExterno = /^https?:\/\//.test(punto.ctaHref);
  popupCta.target = esExterno ? '_blank' : '';
  popupCta.rel = esExterno ? 'noopener' : '';

  if (punto.categoria === 'cancha') {
    popupPrecio.textContent = textoPrecioCancha();
  } else {
    popupPrecio.textContent = punto.precio;
  }
  popupPrecio.style.display = popupPrecio.textContent ? 'block' : 'none';

  cargarFotosHero(punto.fotos, popupFotos);

  overlay.classList.add('activo');
}

function cerrarPopup() {
  overlay.classList.remove('activo');
}

document.getElementById('mapa-cerrar').addEventListener('click', cerrarPopup);
overlay.addEventListener('click', e => { if (e.target === overlay) cerrarPopup(); });

if (botonAnterior && botonSiguiente) {
  botonAnterior.addEventListener('click', () => {
    const indice = (indiceActual - 1 + PUNTOS.length) % PUNTOS.length;
    abrirPopup(PUNTOS[indice], indice);
  });
  botonSiguiente.addEventListener('click', () => {
    const indice = (indiceActual + 1) % PUNTOS.length;
    abrirPopup(PUNTOS[indice], indice);
  });
}

PUNTOS.forEach((punto, indice) => {
  const pin = document.createElement('button');
  pin.className = 'mapa-pin';
  pin.style.left = punto.x + '%';
  pin.style.top = punto.y + '%';
  pin.style.background = COLORES[punto.categoria];
  pin.setAttribute('aria-label', punto.titulo);
  pin.addEventListener('click', () => abrirPopup(punto, indice));
  contenedorPines.appendChild(pin);
});

cargarPrecioCancha();
