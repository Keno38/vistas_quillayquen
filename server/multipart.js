// Parser mínimo de multipart/form-data (formularios con archivos adjuntos),
// escrito a mano para no depender de paquetes externos como "multer" o "busboy".
// Alcance limitado a lo que necesita este sitio: campos de texto simples y un
// archivo (el comprobante de transferencia).

function extraerBoundary(contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!match) return null;
  return match[1] || match[2];
}

// body: Buffer con el cuerpo completo de la solicitud.
// Devuelve { campos: {nombre: valor}, archivos: {nombre: {filename, contentType, data}} }
function parseMultipart(body, contentType) {
  const boundary = extraerBoundary(contentType);
  if (!boundary) {
    const err = new Error('Content-Type sin boundary de multipart/form-data');
    err.status = 400;
    throw err;
  }
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const campos = {};
  const archivos = {};

  let start = body.indexOf(boundaryBuf);
  if (start === -1) return { campos, archivos };
  start += boundaryBuf.length;

  while (true) {
    if (body.slice(start, start + 2).toString() === '--') break; // boundary final
    if (body.slice(start, start + 2).toString('binary') === '\r\n') start += 2;

    const siguiente = body.indexOf(boundaryBuf, start);
    if (siguiente === -1) break;

    let parte = body.slice(start, siguiente);
    if (parte.slice(-2).toString('binary') === '\r\n') parte = parte.slice(0, -2);

    const finCabeceras = parte.indexOf('\r\n\r\n');
    if (finCabeceras !== -1) {
      const cabeceras = parte.slice(0, finCabeceras).toString('utf8');
      const contenido = parte.slice(finCabeceras + 4);

      const nombreMatch = /name="([^"]+)"/i.exec(cabeceras);
      const archivoMatch = /filename="([^"]*)"/i.exec(cabeceras);
      const tipoMatch = /Content-Type:\s*([^\r\n]+)/i.exec(cabeceras);

      if (nombreMatch) {
        const nombre = nombreMatch[1];
        if (archivoMatch && archivoMatch[1]) {
          archivos[nombre] = {
            filename: archivoMatch[1],
            contentType: tipoMatch ? tipoMatch[1].trim() : 'application/octet-stream',
            data: contenido
          };
        } else {
          campos[nombre] = contenido.toString('utf8');
        }
      }
    }

    start = siguiente + boundaryBuf.length;
  }

  return { campos, archivos };
}

module.exports = { parseMultipart };
