// Pie de página completo de la portada (teléfono, correo, dirección y mapa):
// usa los mismos datos que ya carga /contacto.html desde el panel de Contenido.
(async function () {
  const telefonoEl = document.getElementById('footer-telefono');
  const correoEl = document.getElementById('footer-correo');
  const direccionEl = document.getElementById('footer-direccion');
  const mapaEl = document.getElementById('footer-mapa');
  const mapaLinkEl = document.getElementById('footer-mapa-link');
  const ubicacionPiscinaEl = document.getElementById('piscina-ubicacion');
  if (!telefonoEl) return;

  try {
    const resp = await fetch('/api/contacto-publico');
    const datos = await resp.json();

    telefonoEl.textContent = datos.telefono_contacto || 'Pronto publicaremos nuestro teléfono.';
    if (datos.correo_contacto) {
      correoEl.innerHTML = `<a href="mailto:${datos.correo_contacto}">${datos.correo_contacto}</a>`;
    }
    direccionEl.textContent = datos.direccion_recinto || 'Pronto publicaremos la dirección.';
    if (ubicacionPiscinaEl && datos.direccion_recinto) {
      ubicacionPiscinaEl.textContent = datos.direccion_recinto;
    }

    if (datos.mapa_embed_url) {
      mapaEl.src = datos.mapa_embed_url;
      mapaEl.classList.remove('oculto');
      mapaLinkEl.href = datos.mapa_embed_url;
      mapaLinkEl.classList.remove('oculto');
    }
  } catch (err) {
    telefonoEl.textContent = 'No pudimos cargar los datos de contacto.';
  }
})();
