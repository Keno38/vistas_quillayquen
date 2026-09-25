-- Migración 002: pago con comprobante para reservas de cancha.
-- Ejecutar una sola vez en el SQL Editor de Supabase (proyecto que ya corrió schema.sql).

-- 1) Precio de la cancha y porcentaje de abono, editables desde el panel de admin.
alter table config add column if not exists valor_cancha_hora integer not null default 24000;
alter table config add column if not exists abono_porcentaje integer not null default 30
  check (abono_porcentaje between 1 and 100);

-- 2) Datos de pago y verificación en cada reserva.
alter table reservas_cancha add column if not exists tipo_pago text
  check (tipo_pago in ('abono', 'completo'));
alter table reservas_cancha add column if not exists monto_esperado integer;
alter table reservas_cancha add column if not exists comprobante_path text;
alter table reservas_cancha add column if not exists estado text not null default 'pendiente_verificacion'
  check (estado in ('pendiente_verificacion', 'confirmada', 'rechazada', 'cancelada'));
alter table reservas_cancha add column if not exists motivo text;

-- Reservas que ya existían antes de esta migración quedan como confirmadas
-- (fueron creadas bajo el sistema anterior, sin comprobante).
update reservas_cancha set estado = 'confirmada' where tipo_pago is null;

-- 3) La restricción única anterior bloqueaba el bloque para siempre, incluso si
-- la reserva se rechazaba o cancelaba. La reemplazamos por un índice único
-- parcial: solo bloquea el horario mientras la reserva esté activa
-- (pendiente de verificación o confirmada), liberándolo si se rechaza o cancela.
alter table reservas_cancha drop constraint if exists reservas_cancha_cancha_id_fecha_hora_inicio_key;
create unique index if not exists idx_reserva_cancha_activa_unica
  on reservas_cancha (cancha_id, fecha, hora_inicio)
  where estado in ('pendiente_verificacion', 'confirmada');

-- 4) Bucket privado para los comprobantes de transferencia (solo el servidor,
-- con la clave service_role, puede leer/escribir aquí).
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;
