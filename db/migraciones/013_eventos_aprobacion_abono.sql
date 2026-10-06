-- Migración 013: flujo de aprobación de solicitudes de Eventos con abono del 50%.
-- Estados: pendiente -> aprobada (se envían datos de transferencia + abono)
--          -> confirmado (cuando el abono está verificado) / rechazado.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

alter table eventos add column if not exists monto_total integer;
alter table eventos add column if not exists monto_abono integer;

alter table eventos drop constraint if exists eventos_estado_check;
alter table eventos add constraint eventos_estado_check
  check (estado in ('pendiente', 'aprobada', 'confirmado', 'rechazado'));
