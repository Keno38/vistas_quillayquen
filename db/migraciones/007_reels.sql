-- Migración 007: reels de Instagram para mostrar en la galería.
-- Se pegan a mano (URL del reel) desde el panel de Contenido; no hay
-- integración automática con la API de Meta todavía.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

create table if not exists reels (
  id serial primary key,
  url text not null,
  cuenta text not null check (cuenta in ('vistas', 'ferreteria')),
  titulo text default '',
  activo boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

alter table reels enable row level security;
