// Si el superadmin subió una imagen de portada (hero) para esta página desde
// el panel de Contenido, la usamos en vez de la foto de muestra por defecto.
(async function () {
  const img = document.querySelector('img[data-hero-pagina]');
  if (!img) return;
  const pagina = img.getAttribute('data-hero-pagina');
  try {
    const resp = await fetch('/api/hero-publico');
    const data = await resp.json();
    if (data && data[pagina]) {
      img.src = data[pagina];
      const nota = document.getElementById(`hero-nota-${pagina}`);
      if (nota) nota.classList.add('oculto');
    }
  } catch (err) {
    // Sin conexión a la API: se deja la foto de muestra tal cual.
  }
})();
