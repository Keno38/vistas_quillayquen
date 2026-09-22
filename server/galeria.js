// Galería de fotos y videos, basada en archivos.
// No hay formulario de subida ni base de datos: el administrador copia sus fotos y
// videos directamente en las carpetas public/galeria/recinto y public/galeria/eventos/<album>
// (por ejemplo por FTP, escritorio remoto o copiando el archivo en el servidor).
// Esta función solo escanea esas carpetas y arma la lista para la página pública.
// Así la galería se puede ir actualizando con el tiempo sin tocar código.

const fs = require('fs');
const path = require('path');

const GALERIA_DIR = path.join(__dirname, '..', 'public', 'galeria');
const RECINTO_DIR = path.join(GALERIA_DIR, 'recinto');
const EVENTOS_DIR = path.join(GALERIA_DIR, 'eventos');

const EXT_IMAGEN = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const EXT_VIDEO = ['.mp4', '.webm', '.mov'];

function tipoDeArchivo(nombre) {
  const ext = path.extname(nombre).toLowerCase();
  if (EXT_IMAGEN.includes(ext)) return 'imagen';
  if (EXT_VIDEO.includes(ext)) return 'video';
  return null;
}

// Lista los archivos de imagen/video de una carpeta, más recientes primero,
// como URLs públicas (relativas a /galeria/...).
function listarArchivos(dirAbsoluto, prefijoUrl) {
  if (!fs.existsSync(dirAbsoluto)) return [];
  const items = fs.readdirSync(dirAbsoluto, { withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => {
      const tipo = tipoDeArchivo(e.name);
      if (!tipo) return null;
      const stat = fs.statSync(path.join(dirAbsoluto, e.name));
      return {
        nombre: e.name,
        tipo,
        url: `${prefijoUrl}/${encodeURIComponent(e.name)}`,
        modificado: stat.mtimeMs
      };
    })
    .filter(Boolean);
  items.sort((a, b) => b.modificado - a.modificado);
  return items.map(({ nombre, tipo, url }) => ({ nombre, tipo, url }));
}

// Recorre public/galeria/eventos/<album>/ y arma un álbum por subcarpeta.
// Las subcarpetas más recientes (por fecha de modificación) van primero.
function listarAlbumesEventos() {
  if (!fs.existsSync(EVENTOS_DIR)) return [];
  const carpetas = fs.readdirSync(EVENTOS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => {
      const dirAbsoluto = path.join(EVENTOS_DIR, e.name);
      const stat = fs.statSync(dirAbsoluto);
      return {
        nombre: e.name,
        modificado: stat.mtimeMs,
        items: listarArchivos(dirAbsoluto, `/galeria/eventos/${encodeURIComponent(e.name)}`)
      };
    })
    .filter(album => album.items.length > 0);
  carpetas.sort((a, b) => b.modificado - a.modificado);
  return carpetas.map(({ nombre, items }) => ({ nombre, items }));
}

function listar() {
  return {
    recinto: listarArchivos(RECINTO_DIR, '/galeria/recinto'),
    eventos: listarAlbumesEventos()
  };
}

module.exports = { listar };
