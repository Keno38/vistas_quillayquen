// Si el superadmin configuró un correo de contacto en el panel de Contenido,
// lo mostramos en el pie de página como link "mailto:". Si no hay ninguno
// configurado, el párrafo se queda oculto.
(async function () {
  const el = document.getElementById('footer-contacto');
  if (!el) return;
  try {
    const resp = await fetch('/api/contacto-publico');
    const data = await resp.json();
    if (data && data.correo) {
      el.innerHTML = `¿Sugerencias o consultas? Escríbenos a <a href="mailto:${data.correo}">${data.correo}</a>`;
      el.classList.remove('oculto');
    }
  } catch (err) {
    // Sin conexión a la API: el párrafo se queda oculto, sin romper la página.
  }
})();
