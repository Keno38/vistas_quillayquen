// Envío de correos (notificaciones de reservas/solicitudes) sin paquetes
// externos: se habla SMTP directo por TLS usando el módulo nativo `tls`,
// igual de "a mano" que el cliente de Supabase o el parser de multipart.
//
// Pensado para Gmail/Google Workspace: smtp.gmail.com puerto 465 (TLS
// implícito) + una "contraseña de aplicación" de 16 caracteres (nunca la
// clave normal de la cuenta). Variables de entorno (se configuran en Render,
// nunca en este archivo):
//   SMTP_USER      -> el correo de Workspace (ej. contacto@empresa.cl)
//   SMTP_PASSWORD  -> la contraseña de aplicación
//   SMTP_HOST      -> opcional, por defecto smtp.gmail.com
//   SMTP_PORT      -> opcional, por defecto 465
//   SMTP_FROM_NAME -> opcional, nombre que aparece como remitente

require('./env');
const tls = require('tls');
const { pg } = require('./supabaseClient');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = (process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
const FROM_NOMBRE = process.env.SMTP_FROM_NAME || 'Vistas de Quillayquen';

function leerRespuesta(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    function onData(chunk) {
      buffer += chunk.toString('utf8');
      const lineas = buffer.split('\r\n').filter(Boolean);
      const ultima = lineas[lineas.length - 1] || '';
      // Una respuesta multilínea ("250-...") termina cuando la última línea
      // trae un espacio después del código (no un guión).
      if (/^\d{3} /.test(ultima)) {
        limpiar();
        resolve(buffer);
      }
    }
    function onError(err) { limpiar(); reject(err); }
    function limpiar() {
      socket.removeListener('data', onData);
      socket.removeListener('error', onError);
    }
    socket.on('data', onData);
    socket.on('error', onError);
  });
}

function comando(socket, texto) {
  socket.write(texto + '\r\n');
  return leerRespuesta(socket);
}

function codigoOk(respuesta, ...esperados) {
  const codigo = parseInt(String(respuesta).slice(0, 3), 10);
  return esperados.includes(codigo);
}

function asuntoMime(texto) {
  return `=?UTF-8?B?${Buffer.from(texto, 'utf8').toString('base64')}?=`;
}

// Lanza un error si falla — quien la llame decide si le importa o no
// (usar enviarCorreoSeguro si el correo es "mejor esfuerzo").
async function enviarCorreo({ to, subject, html }) {
  if (!SMTP_USER || !SMTP_PASSWORD) {
    throw new Error('Falta configurar SMTP_USER/SMTP_PASSWORD (ver server/mailer.js)');
  }
  const destinatarios = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (destinatarios.length === 0) return;

  const socket = tls.connect({ host: SMTP_HOST, port: SMTP_PORT });
  try {
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });
    await leerRespuesta(socket); // 220 saludo

    let r = await comando(socket, `EHLO ${SMTP_HOST}`);
    if (!codigoOk(r, 250)) throw new Error('EHLO rechazado: ' + r);

    r = await comando(socket, 'AUTH LOGIN');
    if (!codigoOk(r, 334)) throw new Error('AUTH LOGIN rechazado: ' + r);

    r = await comando(socket, Buffer.from(SMTP_USER).toString('base64'));
    if (!codigoOk(r, 334)) throw new Error('Usuario SMTP rechazado: ' + r);

    r = await comando(socket, Buffer.from(SMTP_PASSWORD).toString('base64'));
    if (!codigoOk(r, 235)) throw new Error('Contraseña de aplicación rechazada: ' + r);

    r = await comando(socket, `MAIL FROM:<${SMTP_USER}>`);
    if (!codigoOk(r, 250)) throw new Error('MAIL FROM rechazado: ' + r);

    for (const destinatario of destinatarios) {
      r = await comando(socket, `RCPT TO:<${destinatario}>`);
      if (!codigoOk(r, 250, 251)) throw new Error(`RCPT TO rechazado (${destinatario}): ` + r);
    }

    r = await comando(socket, 'DATA');
    if (!codigoOk(r, 354)) throw new Error('DATA rechazado: ' + r);

    const cuerpo = String(html).replace(/\r?\n\./g, '\n..'); // transparencia SMTP (líneas que empiezan con ".")
    const mensaje = [
      `From: ${FROM_NOMBRE} <${SMTP_USER}>`,
      `To: ${destinatarios.join(', ')}`,
      `Subject: ${asuntoMime(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      cuerpo
    ].join('\r\n');

    r = await comando(socket, `${mensaje}\r\n.`);
    if (!codigoOk(r, 250)) throw new Error('El servidor de correo no aceptó el mensaje: ' + r);

    await comando(socket, 'QUIT');
  } finally {
    socket.end();
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
