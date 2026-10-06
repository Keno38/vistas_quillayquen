// Galería lateral de la portada: muestra las 2 fotos de Recinto más recientes
// subidas desde el panel de Contenido. Si todavía no hay ninguna, se quedan
// las fotos de muestra del HTML.
(async function () {
  try {
    const resp = await fetch('/api/galeria');
    const data = await resp.json();
    const fotos = (data.recinto || []).filter(i => i.tipo === 'imagen').slice(0, 2);
    fotos.forEach((foto, i) => {
      const img = document.getElementById(`lateral-recinto-${i + 1}`);
      const texto = document.getElementById(`lateral-recinto-${i + 1}-texto`);
      if (img) { img.src = foto.url; img.alt = foto.nombre; }
      if (texto) texto.textContent = 'Recinto';
    });
  } catch (err) {
    // Sin conexión a la API: se quedan las fotos de muestra.
  }
})();
