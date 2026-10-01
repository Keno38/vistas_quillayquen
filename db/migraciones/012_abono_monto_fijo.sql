-- Migración 012: el abono de canchas pasa de ser un porcentaje a un monto
-- fijo en pesos (más simple de entender/editar desde el panel de Contenido).
-- Ejecutar una sola vez en el SQL Editor de Supabase.

alter table config add column if not exists monto_abono_fijo integer;

-- Si ya existe un abono_porcentaje configurado, lo usamos para calcular el
-- monto equivalente (continuidad), para que no cambie el valor que ya veían
-- los clientes. Si quieres un monto distinto, lo editas después en Contenido.
update config
set monto_abono_fijo = round(valor_cancha_hora * abono_porcentaje / 100.0)
where monto_abono_fijo is null;

alter table config alter column monto_abono_fijo set default 7200;
alter table config alter column monto_abono_fijo set not null;
