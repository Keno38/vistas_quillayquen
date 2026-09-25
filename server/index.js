// Servidor del sitio Vistas Quillaiquen.
// Escrito solo con módulos nativos de Node.js (sin Express ni otras dependencias),
// para poder ejecutarse con `node server/index.js` sin necesidad de `npm install`.

require('./env');

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const canchas = require('./canchas');
const eventos = require('./eventos');
const auth = require('./auth');
const galeria = require('./galeria');
const { parseMultipart } = require('./multipart');

const MAX_COMPROBANTE_BYTES = 8 * 1024 * 1024; // 8MB, de sobra para una foto/PDF de comprobante

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime'
};

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    // Se acumula como Buffer y se decodifica UTF-8 una sola vez al final: concatenar
    // por chunk como string (data += chunk) puede partir un carácter multibyte
    // (tildes, ñ) justo en el límite entre dos paquetes de red y corromperlo.
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > 1e6) {
        reject(Object.assign(new Error('Cuerpo de solicitud demasiado grande'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (total === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(Object.assign(new Error('JSON inválido'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// Igual que readBody, pero sin asumir JSON: devuelve el cuerpo crudo como Buffer
// (lo usamos para el formulario multipart/form-data con el comprobante adjunto).
function readRawBody(req, maxBytes = MAX_COMPROBANTE_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error('El archivo adjunto es demasiado grande (máximo 8MB)'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function requireAdmin(req) {
  const cookies = parseCookies(req);
  if (!auth.verificar(cookies.admin_token)) {
    const err = new Error('No autorizado. Debe iniciar sesión como administrador.');
    err.status = 401;
    throw err;
  }
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(PUBLIC_DIR, filePath);

  // Evita salir del directorio public/
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Prohibido');
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end('<h1>404 - Página no encontrada</h1><p><a href="/">Volver al inicio</a></p>');
      }
      res.writeHead(500);
      return res.end('Error del servidor');
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

async function handleApi(req, res, pathname, query) {
  try {
    // ---- Canchas ----
    if (pathname === '/api/canchas/disponibilidad' && req.method === 'GET') {
      return sendJSON(res, 200, await canchas.disponibilidad(query.fecha));
    }
    if (pathname === '/api/canchas/config' && req.method === 'GET') {
      const config = await canchas.getConfig();
      const monto_abono = Math.round((config.valor_cancha_hora * config.abono_porcentaje) / 100);
      return sendJSON(res, 200, {
        valor_cancha_hora: config.valor_cancha_hora,
        abono_porcentaje: config.abono_porcentaje,
        monto_abono,
        monto_completo: config.valor_cancha_hora
      });
    }
    if (pathname === '/api/canchas/reservar' && req.method === 'POST') {
      const contentType = req.headers['content-type'] || '';
      if (!contentType.startsWith('multipart/form-data')) {
        const err = new Error('Debe enviar el formulario con el comprobante adjunto (multipart/form-data)');
        err.status = 400;
        throw err;
      }
      const raw = await readRawBody(req);
      const { campos, archivos } = parseMultipart(raw, contentType);
      const reserva = await canchas.reservar(campos, archivos.comprobante);
      return sendJSON(res, 201, { ok: true, reserva });
    }

    // ---- Eventos (centro de eventos con piscina) ----
    if (pathname === '/api/eventos/calendario' && req.method === 'GET') {
      return sendJSON(res, 200, await eventos.calendario(query.mes));
    }
    if (pathname === '/api/eventos/solicitar' && req.method === 'POST') {
      const body = await readBody(req);
      const solicitud = await eventos.solicitar(body);
      return sendJSON(res, 201, { ok: true, solicitud });
    }

    // ---- Galería (recinto y eventos) ----
    if (pathname === '/api/galeria' && req.method === 'GET') {
      return sendJSON(res, 200, galeria.listar());
    }

    // ---- Autenticación admin ----
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const body = await readBody(req);
      const token = await auth.login(body.usuario, body.password);
      if (!token) return sendJSON(res, 401, { ok: false, error: 'Usuario o contraseña incorrectos' });
      res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800`);
      return sendJSON(res, 200, { ok: true });
    }
    if (pathname === '/api/admin/logout' && req.method === 'POST') {
      const cookies = parseCookies(req);
      auth.logout(cookies.admin_token);
      res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; Path=/; Max-Age=0');
      return sendJSON(res, 200, { ok: true });
    }
    if (pathname === '/api/admin/sesion' && req.method === 'GET') {
      const cookies = parseCookies(req);
      return sendJSON(res, 200, { autenticado: auth.verificar(cookies.admin_token) });
    }

    // ---- Admin: canchas ----
    if (pathname === '/api/admin/canchas/reservas' && req.method === 'GET') {
      requireAdmin(req);
      return sendJSON(res, 200, await canchas.listarReservas(query));
    }
    const matchCancelarCancha = pathname.match(/^\/api\/admin\/canchas\/reservas\/(\d+)$/);
    if (matchCancelarCancha && req.method === 'DELETE') {
      requireAdmin(req);
      const body = await readBody(req).catch(() => ({}));
      const cancelada = await canchas.cancelarReserva(matchCancelarCancha[1], body.motivo);
      return sendJSON(res, 200, { ok: true, reserva: cancelada });
    }
    const matchConfirmarCancha = pathname.match(/^\/api\/admin\/canchas\/reservas\/(\d+)\/confirmar$/);
    if (matchConfirmarCancha && req.method === 'POST') {
      requireAdmin(req);
      const confirmada = await canchas.confirmarReserva(matchConfirmarCancha[1]);
      return sendJSON(res, 200, { ok: true, reserva: confirmada });
    }
    const matchRechazarCancha = pathname.match(/^\/api\/admin\/canchas\/reservas\/(\d+)\/rechazar$/);
    if (matchRechazarCancha && req.method === 'POST') {
      requireAdmin(req);
      const body = await readBody(req);
      const rechazada = await canchas.rechazarReserva(matchRechazarCancha[1], body.motivo);
      return sendJSON(res, 200, { ok: true, reserva: rechazada });
    }
    const matchComprobante = pathname.match(/^\/api\/admin\/canchas\/reservas\/(\d+)\/comprobante$/);
    if (matchComprobante && req.method === 'GET') {
      requireAdmin(req);
      const { buffer, contentType } = await canchas.obtenerArchivoComprobante(matchComprobante[1]);
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(buffer);
    }
    if (pathname === '/api/admin/canchas/config' && req.method === 'PUT') {
      requireAdmin(req);
      const body = await readBody(req);
      const actualizada = await canchas.actualizarConfig(body);
      return sendJSON(res, 200, { ok: true, config: actualizada });
    }

    // ---- Admin: eventos ----
    if (pathname === '/api/admin/eventos' && req.method === 'GET') {
      requireAdmin(req);
      return sendJSON(res, 200, await eventos.listar(query));
    }
    const matchEstadoEvento = pathname.match(/^\/api\/admin\/eventos\/(\d+)\/estado$/);
    if (matchEstadoEvento && req.method === 'POST') {
      requireAdmin(req);
      const body = await readBody(req);
      const actualizado = await eventos.cambiarEstado(matchEstadoEvento[1], body.estado);
      return sendJSON(res, 200, { ok: true, evento: actualizado });
    }

    return sendJSON(res, 404, { error: 'Ruta de API no encontrada' });
  } catch (err) {
    return sendJSON(res, err.status || 500, { error: err.message || 'Error interno del servidor' });
  }
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);

  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname, parsed.query);
  } else {
    serveStatic(req, res, pathname);
  }
});

server.listen(PORT, () => {
  console.log(`Vistas Quillaiquen escuchando en http://localhost:${PORT}`);
  console.log(`Panel admin: http://localhost:${PORT}/admin.html`);
  console.log('Usuario admin por defecto: admin / quillaiquen2026  (cámbialo apenas puedas, ver README.md)');
});
