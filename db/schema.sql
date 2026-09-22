-- Esquema de base de datos para Vistas Quillaiquen.
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
  creado_en timestamptz not null default now(),
  -- Evita doble reserva del mismo bloque aunque lleguen dos solicitudes al mismo tiempo.
  unique (cancha_id, fecha, hora_inicio)
);

create table if not exists eventos (
  id serial primary key,
  fecha date not null,
  contacto_nombre text not null,
  institucion text default '',
  telefono text not null,
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
  constraint config_fila_unica check (id = 1)
);

create table if not exists admin_usuarios (
  usuario text primary key,
  salt text not null,
  password_hash text not null
);

-- El servidor accede con la clave "service_role" (nunca la "anon"), que ya
-- salta las políticas de RLS. Igual dejamos RLS activado y sin políticas
-- públicas, como defensa adicional por si alguna vez se usa la clave anon.
alter table canchas enable row level security;
alter table reservas_cancha enable row level security;
alter table eventos enable row level security;
alter table config enable row level security;
alter table admin_usuarios enable row level security;

-- Datos iniciales (equivalentes a los que traía data/db.json por defecto).
insert into canchas (id, nombre) values (1, 'Cancha 1'), (2, 'Cancha 2')
  on conflict (id) do nothing;

insert into config (id) values (1)
  on conflict (id) do nothing;

-- Usuario admin por defecto: admin / quillaiquen2026 (cámbiala luego, ver README.md).
insert into admin_usuarios (usuario, salt, password_hash) values (
  'admin',
  '208fb32c53880573ce1ecf58cafc6d33',
  'a91f8e6447fe62157750e96a35b21f2b7924a84c0b9aaf6b647e4b4a86d8ede6'
) on conflict (usuario) do nothing;
