-- Migración 010: notificaciones por correo (nueva solicitud/reserva, y
-- aceptada/rechazada) + correo de contacto público.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

-- Correo de Workspace que envía las notificaciones, recibe el aviso de
-- solicitudes/reservas nuevas, y se muestra como contacto público.
alter table config add column if not exists correo_contacto text;

-- Eventos no pedía correo del cliente (solo teléfono); sin esto no se le
-- puede avisar por correo si se acepta o rechaza su solicitud.
alter table eventos add column if not exists correo_cliente text;
