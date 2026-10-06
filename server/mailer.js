// Envío de correos (notificaciones de reservas/solicitudes) por la API HTTPS de
// Brevo. Se usa HTTPS (puerto 443) porque hosting como Render bloquea las
// conexiones SMTP salientes. Variables de entorno (se configuran en el hosting):
//   BREVO_API_KEY  -> clave de API de Brevo (SMTP & API > API keys)
//   SMTP_USER      -> correo remitente verificado en Brevo
//   SMTP_FROM_NAME -> opcional, nombre que aparece como remitente

require('./env');
const { pg } = require('./supabaseClient');

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').trim();
const REMITENTE = (process.env.SMTP_USER || '').trim();
const FROM_NOMBRE = process.env.SMTP_FROM_NAME || 'Vistas de Quillayquén';

async function enviarCorreo({ to, subject, html }) {
  if (!BREVO_API_KEY || !REMITENTE) {
    throw new Error('Falta configurar BREVO_API_KEY y SMTP_USER');
  }
  const destinatarios = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (destinatarios.length === 0) return;

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: { name: FROM_NOMBRE, email: REMITENTE },
      to: destinatarios.map(email => ({ email })),
      subject,
      htmlContent: html
    })
  });

  if (!resp.ok) {
    const detalle = await resp.text().catch(() => '');
    throw new Error(`Brevo rechazó el envío (${resp.status}): ${detalle || resp.statusText}`);
  }
}

// Para notificaciones "mejor esfuerzo": si el correo falla, se registra en
// los logs pero no interrumpe la reserva/solicitud que la disparó.
async function enviarCorreoSeguro(opciones) {
  try {
    await enviarCorreo(opciones);
  } catch (err) {
    console.error('[correo] No se pudo enviar:', opciones.subject, '-', err.message);
  }
}

async function obtenerCorreoContacto() {
  const [config] = await pg('/config?id=eq.1&select=correo_contacto');
  return config ? config.correo_contacto : null;
}

async function actualizarCorreoContacto(correo) {
  const valor = correo ? String(correo).trim() : null;
  const actualizados = await pg('/config?id=eq.1', { method: 'PATCH', body: { correo_contacto: valor } });
  return actualizados[0].correo_contacto;
}

module.exports = { enviarCorreo, enviarCorreoSeguro, obtenerCorreoContacto, actualizarCorreoContacto };
