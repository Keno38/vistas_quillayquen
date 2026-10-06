-- Migración 014: eventos de más de 120 personas son exclusivos (ocupan el
-- recinto completo ese día); los de 120 o menos comparten el recinto, así que
-- ya no se puede bloquear el día solo por tener un evento confirmado.
-- La regla ahora se valida en el servidor (server/eventos.js).
-- Ejecutar una sola vez en el SQL Editor de Supabase.

drop index if exists un_evento_confirmado_por_fecha;
