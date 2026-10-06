// Llena la página de Contáctanos con los datos que el superadmin guardó en Contenido.
(async function () {
  const textoTelefono = document.getElementById('contacto-telefono');
  const textoCorreo = document.getElementById('contacto-correo');
  const textoDireccion = document.getElementById('contacto-direccion');
  const mapa = document.getElementById('contacto-mapa');
  const mapaVacio = document.getElementById('contacto-mapa-vacio');
  const videoBloque = document.getElementById('contacto-video-contenedor');
  const videoLink = document.getElementById('contacto-video');

  try {
    const resp = await fetch('/api/contacto-publico');
    const datos = await resp.json();

    if (datos.telefono_contacto) {
      const numero = datos.telefono_contacto.replace(/[^\d+]/g, '');
      const whatsapp = numero.replace(/^\+/, '');
      textoTelefono.innerHTML = `${datos.telefono_contacto}<br><a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener">Escribir por WhatsApp</a>`;
    } else {
      textoTelefono.textContent = 'Pronto publicaremos nuestro teléfono.';
    }

    if (datos.correo_contacto) {
      textoCorreo.innerHTML = `<a href="mailto:${datos.correo_contacto}">${datos.correo_contacto}</a>`;
    } else {
      textoCorreo.textContent = 'Pronto publicaremos nuestro correo.';
    }

    textoDireccion.textContent = datos.direccion_recinto || 'Pronto publicaremos la dirección.';

    if (datos.mapa_embed_url) {
      mapa.src = datos.mapa_embed_url;
      mapa.classList.remove('oculto');
    } else {
      mapaVacio.classList.remove('oculto');
    }

    if (datos.video_como_llegar_url) {
      videoLink.href = datos.video_como_llegar_url;
      videoBloque.classList.remove('oculto');
    }
  } catch (err) {
    textoTelefono.textContent = 'No pudimos cargar los datos de contacto. Intenta más tarde.';
    textoCorreo.textContent = '';
    textoDireccion.textContent = '';
  }
})();
