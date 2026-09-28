-- Migración 008: subida de fotos/videos de la galería y de las imágenes del
-- hero directamente desde el panel de Contenido (superadmin), en vez de tener
-- que copiar archivos a mano en el servidor.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

-- 1) Bucket público: a diferencia de "comprobantes" (privado), estas fotos se
-- muestran directamente en el sitio público, así que cualquiera puede leerlas.
insert into storage.buckets (id, name, public)
values ('galeria', 'galeria', true)
on conflict (id) do nothing;

-- 2) Fotos y videos de la galería (Recinto / Eventos). "album" solo se usa en
-- la sección "eventos", para agrupar por evento (ej. "Matrimonio Pérez").
create table if not exists galeria_items (
  id serial primary key,
  seccion text not null check (seccion in ('recinto', 'eventos')),
  album text not null default '',
  storage_path text not null,
  tipo_archivo text not null check (tipo_archivo in ('imagen', 'video')),
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

-- 3) Imagen de portada (hero) de cada página pública. Si no hay fila para una
-- página, el sitio sigue mostrando la foto de muestra que ya tenía.
create table if not exists hero_imagenes (
  pagina text primary key check (pagina in ('index', 'canchas', 'eventos')),
  storage_path text not null,
  actualizado_en timestamptz not null default now()
);
