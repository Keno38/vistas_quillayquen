-- Esquema de base de datos para Vistas de Quillayquen.
-- Ejecutar una sola vez en Supabase: Panel del proyecto > SQL Editor > New query > pegar todo > Run.
-- Reemplaza el almacenamiento anterior en data/db.json.

create table if not exists canchas (
  id serial primary key,
  nombre text not null
);

create table if not exists reservas_cancha (
  id serial primary key,
  cancha_id integer not null references canchas(id) on delete cascade,
  fecha date not null,
  hora_inicio text not null,
  hora_fin text not null,
  nombre_cliente text not null,
  telefono text not null,
  correo_cliente text,
  creado_en timestamptz not null default now(),
  -- Pago por transferencia con comprobante adjunto (ver README, sección "Pagos").
  tipo_pago text check (tipo_pago in ('abono', 'completo')),
  monto_esperado integer,
  comprobante_path text,
  estado text not null default 'pendiente_verificacion'
    check (estado in ('pendiente_verificacion', 'confirmada', 'rechazada', 'cancelada')),
  motivo text
);

-- Evita doble reserva del mismo bloque, pero solo mientras la reserva esté activa
-- (pendiente de verificación o confirmada): si se rechaza o cancela, el horario
-- vuelve a quedar disponible para otra persona.
create unique index if not exists idx_reserva_cancha_activa_unica
  on reservas_cancha (cancha_id, fecha, hora_inicio)
  where estado in ('pendiente_verificacion', 'confirmada');

create table if not exists eventos (
  id serial primary key,
  fecha date not null,
  contacto_nombre text not null,
  institucion text default '',
  telefono text not null,
  correo_cliente text,
  cantidad_personas integer,
  con_menu boolean not null default false,
  comentario text default '',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'rechazado')),
  creado_en timestamptz not null default now()
);

-- Evita dos eventos "confirmado" el mismo día, aunque se confirmen casi al mismo tiempo.
create unique index if not exists un_evento_confirmado_por_fecha
  on eventos (fecha)
  where estado = 'confirmado';

create table if not exists config (
  id integer primary key default 1,
  hora_inicio_canchas text not null default '18:00',
  hora_fin_canchas text not null default '23:00',
  duracion_bloque_min integer not null default 60,
  buffer_cambio_min integer not null default 10,
  menu_evento_nombre text not null default 'Pollo con papas fritas y ensaladas',
  menu_evento_precio_por_persona integer,
  valor_cancha_hora integer not null default 24000,
  abono_porcentaje integer not null default 30 check (abono_porcentaje between 1 and 100),
  -- Monto fijo del abono en pesos (reemplaza al porcentaje de arriba, que ya no se usa).
  monto_abono_fijo integer not null default 7200,
  eventos_capacidad text default 'Hasta 80 personas en el salón techado, más la terraza y el área de piscina.',
  eventos_servicios text default 'Salón techado, piscina, mesas y sillas, estacionamiento.',
  eventos_contacto text default 'Coordina tu evento eligiendo una fecha libre en el calendario. Te contactamos por teléfono/WhatsApp para confirmar los detalles y el pago.',
  -- Correo de Workspace que envía notificaciones, recibe avisos de reservas/
  -- solicitudes nuevas, y se muestra como contacto público.
  correo_contacto text,
  -- Datos bancarios para transferencia, mostrados en Canchas y Eventos.
  datos_transferencia text default
    'RUT: 76.672.268-7
Banco: Banco Santander
Cuenta: Cuenta Corriente
N° Cuenta: 73015359
Correo: vistasquillayquen@gmail.com',
  constraint config_fila_unica check (id = 1)
);

create table if not exists admin_usuarios (
  usuario text primary key,
  salt text not null,
  password_hash text not null,
  -- 'agenda': solo Solicitudes y Reservas. 'general': todo (agenda + Contenido).
  rol text not null default 'agenda' check (rol in ('agenda', 'general'))
);

-- Opciones de menú para el Centro de Eventos, administradas por el
-- superadministrador (ver README, sección "Panel de contenido").
create table if not exists menu_opciones (
  id serial primary key,
  nombre text not null,
  precio_por_persona integer,
  activo boolean not null default true,
  orden integer not null default 0,
  -- 'desayuno', 'almuerzo' u 'once': un evento puede elegir un menú de cada
  -- categoría a la vez (son independientes entre sí).
  categoria text not null default 'almuerzo' check (categoria in ('desayuno', 'almuerzo', 'once'))
);

alter table eventos add column if not exists menu_desayuno_id integer references menu_opciones(id);
alter table eventos add column if not exists menu_almuerzo_id integer references menu_opciones(id);
alter table eventos add column if not exists menu_once_id integer references menu_opciones(id);

-- Reels de Instagram para la galería (se pegan a mano desde el panel de
-- Contenido; ver README, sección "Reels").
create table if not exists reels (
  id serial primary key,
  url text not null,
  cuenta text not null check (cuenta in ('vistas', 'ferreteria')),
  titulo text default '',
  activo boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

-- Fotos y videos de la galería (Recinto / Eventos), subidos desde el panel de
-- Contenido. "album" solo se usa en la sección "eventos" para agrupar fotos
-- de un mismo evento.
create table if not exists galeria_items (
  id serial primary key,
  seccion text not null check (seccion in ('recinto', 'eventos')),
  album text not null default '',
  storage_path text not null,
  tipo_archivo text not null check (tipo_archivo in ('imagen', 'video')),
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

-- Imagen de portada (hero) de cada página pública. Si no hay fila, el sitio
-- muestra la foto de muestra por defecto.
create table if not exists hero_imagenes (
  pagina text primary key check (pagina in ('index', 'canchas', 'eventos')),
  storage_path text not null,
  actualizado_en timestamptz not null default now()
);

-- El servidor accede con la clave "service_role" (nunca la "anon"), que ya
-- salta las políticas de RLS. Igual dejamos RLS activado y sin políticas
-- públicas, como defensa adicional por si alguna vez se usa la clave anon.
alter table canchas enable row level security;
alter table reservas_cancha enable row level security;
alter table eventos enable row level security;
alter table config enable row level security;
alter table admin_usuarios enable row level security;
alter table menu_opciones enable row level security;
alter table reels enable row level security;
alter table galeria_items enable row level security;
alter table hero_imagenes enable row level security;

-- Datos iniciales (equivalentes a los que traía data/db.json por defecto).
insert into canchas (id, nombre) values (1, 'Cancha 1'), (2, 'Cancha 2')
  on conflict (id) do nothing;

insert into config (id) values (1)
  on conflict (id) do nothing;

-- Usuario admin por defecto (rol agenda): admin / quillaiquen2026 (cámbiala luego, ver README.md).
insert into admin_usuarios (usuario, salt, password_hash, rol) values (
  'admin',
  '208fb32c53880573ce1ecf58cafc6d33',
  'a91f8e6447fe62157750e96a35b21f2b7924a84c0b9aaf6b647e4b4a86d8ede6',
  'agenda'
) on conflict (usuario) do nothing;

-- Usuario general por defecto (rol general: agenda + Contenido): general / general2026.
insert into admin_usuarios (usuario, salt, password_hash, rol) values (
  'general',
  '5fc73ec61def3d0bbcf26b499797496e',
  '7c60ef2d5c41915f2979d93f4388924bdb1cdd2b2f02f61cbf9106f7ebd6a024',
  'general'
) on conflict (usuario) do nothing;

insert into menu_opciones (nombre, precio_por_persona, orden)
select 'Pollo con papas fritas y ensaladas', null, 1
where not exists (select 1 from menu_opciones);

-- Bucket privado para los comprobantes de transferencia de las reservas de cancha
-- (solo el servidor, con la clave service_role, puede leer/escribir aquí).
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

-- Bucket público para fotos/videos de la galería y las imágenes del hero
-- (a diferencia de "comprobantes", cualquiera puede leer aquí).
insert into storage.buckets (id, name, public)
values ('galeria', 'galeria', true)
on conflict (id) do nothing;
