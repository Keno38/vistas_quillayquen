-- Migración 015: página "Contáctanos" con teléfono/WhatsApp, dirección, mapa
-- y video de cómo llegar. Todo editable desde el panel de Contenido.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

alter table config add column if not exists telefono_contacto text;
alter table config add column if not exists direccion_recinto text;
alter table config add column if not exists mapa_embed_url text;
alter table config add column if not exists video_como_llegar_url text;
