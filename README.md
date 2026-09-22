# Vistas Quillaiquen — sitio y sistema de reservas

Proyecto para Vistas Quillaiquen (canchas de pasto sintético y centro de eventos con
piscina, parte de Comercializadora PCY). Construido solo con Node.js (sin Express ni
otras librerías: no requiere `npm install`). Los datos se guardan en una base de datos
Postgres en [Supabase](https://supabase.com), a la que el servidor se conecta usando
solo `fetch` nativo (sin instalar ningún cliente).

## Cómo correrlo

Requisitos: tener Node.js instalado (v18 o superior). Verifica con:

```
node -v
```

### 1. Configura la base de datos (una sola vez)

1. Entra al panel de tu proyecto Supabase → **SQL Editor** → **New query**.
2. Copia y pega todo el contenido de [`db/schema.sql`](db/schema.sql) y presiona **Run**.
   Esto crea las tablas y deja cargados los datos iniciales (2 canchas, configuración
   por defecto y el usuario admin).

### 2. Configura las credenciales

1. Copia `.env.example` a un archivo nuevo llamado `.env` (ya está creado en este
   proyecto con la URL puesta).
2. Abre `.env` y completa `SUPABASE_SERVICE_KEY` con la clave **service_role** de tu
   proyecto (Project Settings → API → Project API keys → `service_role`, **no** la
   `anon`/`publishable`). El archivo `.env` nunca se sube a GitHub.

### 3. Inicia el servidor

```
node server/index.js
```

Luego abre en tu navegador:

- Sitio público: http://localhost:3000
- Reserva de canchas: http://localhost:3000/canchas.html
- Centro de eventos: http://localhost:3000/eventos.html
- Galería: http://localhost:3000/galeria.html
- Panel de administración: http://localhost:3000/admin.html

## Usuario de administrador

Usuario: `admin`
Contraseña: `quillaiquen2026`

**Cámbiala apenas puedas.** Corre este comando en tu computador (nunca escribas tu
contraseña nueva en el chat) y te va a imprimir el SQL listo para pegar en el SQL
Editor de Supabase:

```
node scripts/generar-password-admin.js "TU_NUEVA_CONTRASEÑA"
```

## Cómo funciona

### Canchas (2 canchas de pasto sintético)

- Se pueden reservar todos los días, en bloques de 1 hora, entre las 18:00 y las 23:00
  (18:00, 19:00, 20:00, 21:00, 22:00 — 5 bloques por cancha por día).
- La reserva es **automática**: si el bloque está libre, queda confirmada al instante,
  sin necesidad de que un administrador la apruebe.
- Entre el fin de un bloque y el inicio del siguiente hay una **pausa de 10 minutos**
  por defecto (cambio de equipo): por eso el horario real de bloques queda
  18:00-19:00, 19:10-20:10, 20:20-21:20, 21:30-22:30 (4 bloques por cancha por día
  en vez de 5, ya que la pausa resta tiempo vendible). Este valor se puede ajustar
  editando la fila de la tabla `config` en Supabase (columna `buffer_cambio_min`).

### Centro de eventos con piscina

- Se muestra un calendario mensual con tres estados por día: **libre**, **pendiente**
  (hay una solicitud esperando confirmación) y **confirmado** (ya no se puede reservar
  ese día).
- Cualquier persona puede enviar una **solicitud** desde el sitio, indicando si quiere
  el arriendo con menú (pollo con papas fritas y ensaladas) o sin menú, cantidad de
  personas y datos de contacto.
- La solicitud **no se confirma sola**: queda en estado "pendiente" hasta que un
  administrador la confirme o rechace desde el panel de administración. Al confirmar
  una fecha, esa fecha queda bloqueada automáticamente para nuevas solicitudes.

### Galería (recinto y eventos)

- La página `/galeria.html` muestra dos pestañas: **Recinto** (fotos/videos generales
  del lugar) y **Eventos** (álbumes agrupados por evento realizado).
- **No hay formulario de subida ni base de datos para esto**: la galería se actualiza
  copiando archivos directamente en estas carpetas del proyecto:
  - `public/galeria/recinto/` → fotos y videos generales del recinto.
  - `public/galeria/eventos/<nombre del álbum>/` → crea una carpeta por evento
    (por ejemplo `public/galeria/eventos/Matrimonio Perez/`) y copia ahí las fotos
    y videos de ese evento. El nombre de la carpeta es el título que se muestra.
- Formatos aceptados: imágenes `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`; videos `.mp4`,
  `.webm`, `.mov`.
- Apenas copies o borres archivos y refresques la página, la galería se actualiza —
  no hace falta reiniciar el servidor ni tocar código. Cada carpeta trae un archivo
  `LEEME.txt` con estas mismas instrucciones.
- Recomendación: para que las 66 fotos carguen rápido, conviene comprimirlas/reducirlas
  de tamaño antes de copiarlas (por ejemplo a un máximo de ~1600px de ancho). Si quieres,
  puedo ayudarte a redimensionarlas en lote más adelante.

### Panel de administración

- Ver y confirmar/rechazar solicitudes de eventos.
- Ver todas las reservas de canchas y cancelarlas si es necesario (por ejemplo si el
  cliente avisó que no puede ir).

## Dónde están guardados los datos

Todo se guarda en la base de datos Postgres del proyecto Supabase (tablas `canchas`,
`reservas_cancha`, `eventos`, `config`, `admin_usuarios`, definidas en
[`db/schema.sql`](db/schema.sql)). Puedes verlas y editarlas a mano desde el panel de
Supabase → **Table Editor**. Las fotos y videos de la galería siguen guardándose como
archivos en `public/galeria/` (no en la base de datos).

Supabase hace respaldos automáticos del proyecto; para un respaldo manual, usa
**Database → Backups** en el panel, o exporta las tablas desde el Table Editor.

## Pagos

Por ahora el pago **no se gestiona en el sitio**: se coordina aparte (transferencia,
efectivo o en el lugar), tal como se definió para este proyecto. Si más adelante
quieren cobrar una seña o el total al momento de reservar, se puede integrar una
pasarela de pago chilena (Webpay Plus, Flow, Mercado Pago) — es un cambio acotado
sobre esta misma base.

## Próximos pasos sugeridos

- Reemplazar la contraseña de administrador por una propia.
- Agregar fotos reales del recinto en `index.html`, `canchas.html` y `eventos.html`.
- Si quieren que el sitio quede accesible en internet (no solo en tu computador),
  hay que subirlo a un servicio de hosting (por ejemplo un VPS o un servicio como
  Render/Railway) y apuntar el dominio `visatasquillaiquen.cl` (o el que definan) a esa
  dirección — puedo ayudarte con ese paso cuando estés listo para publicarlo.
