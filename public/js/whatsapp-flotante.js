// Botón flotante de WhatsApp (visible en todas las páginas públicas). Abre la
// app de WhatsApp (o WhatsApp Web) con un mensaje ya escrito, para que la
// persona solo tenga que enviarlo. Solo aparece si hay un teléfono guardado
// en Contenido ("Correo de contacto y notificaciones").
(async function () {
  try {
    const resp = await fetch('/api/contacto-publico');
    const datos = await resp.json();
    if (!datos.telefono_contacto) return;

    const numero = datos.telefono_contacto.replace(/[^\d+]/g, '').replace(/^\+/, '');
    const mensaje = encodeURIComponent('Hola, quisiera hacer una consulta sobre Vistas de Quillayquén.');

    const boton = document.createElement('a');
    boton.href = `https://wa.me/${numero}?text=${mensaje}`;
    boton.target = '_blank';
    boton.rel = 'noopener';
    boton.className = 'whatsapp-flotante';
    boton.setAttribute('aria-label', 'Escribir por WhatsApp');
    boton.innerHTML = `
      <svg viewBox="0 0 32 32" width="30" height="30" fill="#fff" aria-hidden="true">
        <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.49.76 4.806 2.06 6.726L4 29l7.46-1.956A11.93 11.93 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.818c-1.98 0-3.823-.58-5.37-1.58l-.385-.243-4.43 1.162 1.183-4.317-.252-.397A9.77 9.77 0 0 1 5.2 15c0-5.964 4.85-10.818 10.804-10.818C21.96 4.182 26.8 9.036 26.8 15s-4.85 9.818-10.796 9.818Zm5.966-7.345c-.327-.164-1.936-.955-2.236-1.064-.3-.11-.518-.164-.736.164-.218.328-.845 1.064-1.036 1.283-.19.218-.382.246-.709.082-.327-.164-1.38-.508-2.628-1.618-.971-.866-1.627-1.936-1.818-2.264-.19-.328-.02-.505.144-.669.148-.147.327-.382.49-.573.164-.19.218-.328.327-.546.11-.218.055-.41-.027-.573-.082-.164-.736-1.773-1.009-2.427-.265-.636-.535-.55-.736-.56-.19-.009-.408-.011-.627-.011-.218 0-.573.082-.873.41-.3.328-1.145 1.12-1.145 2.727 0 1.608 1.172 3.164 1.336 3.382.164.218 2.308 3.523 5.591 4.941.781.337 1.391.538 1.867.689.785.25 1.498.215 2.062.13.629-.094 1.936-.791 2.209-1.555.273-.764.273-1.418.191-1.555-.082-.137-.3-.218-.627-.382Z"/>
      </svg>
    `;
    document.body.appendChild(boton);
  } catch (err) {
    // Sin conexión a la API: no se muestra el botón, sin romper la página.
  }
})();
