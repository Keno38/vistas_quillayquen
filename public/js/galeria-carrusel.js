// Carrusel horizontal de la portada ("Galería: conoce nuestras canchas,
// piscina y espacios"): usa las mismas fotos de Recinto que ya se suben desde
// el panel de Contenido (misma API que /galeria.html).
(async function () {
  const pista = document.getElementById('galeria-carrusel-pista');
  const btnAnterior = document.getElementById('carrusel-anterior');
  const btnSiguiente = document.getElementById('carrusel-siguiente');
  if (!pista) return;

  try {
    const resp = await fetch('/api/galeria');
    const data = await resp.json();
    const fotos = (data.recinto || []).filter(i => i.tipo === 'imagen');
    if (fotos.length === 0) {
      pista.innerHTML = '<p>Pronto subiremos fotos del recinto.</p>';
      return;
    }
    pista.innerHTML = '';
    fotos.forEach(foto => {
      const img = document.createElement('img');
      img.src = foto.url;
      img.alt = foto.nombre || 'Foto del recinto';
      img.loading = 'lazy';
      pista.appendChild(img);
    });
  } catch (err) {
    pista.innerHTML = '<p>No se pudo cargar la galería.</p>';
  }

  if (btnAnterior) btnAnterior.addEventListener('click', () => pista.scrollBy({ left: -320, behavior: 'smooth' }));
  if (btnSiguiente) btnSiguiente.addEventListener('click', () => pista.scrollBy({ left: 320, behavior: 'smooth' }));
})();
