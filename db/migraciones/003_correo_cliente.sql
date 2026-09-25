-- Migración 003: correo electrónico opcional en la reserva de cancha.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

alter table reservas_cancha add column if not exists correo_cliente text;
