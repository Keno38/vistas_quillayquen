-- Migración 011: datos bancarios para transferencia, editables desde el panel
-- de Contenido (rol general), mostrados en Canchas y Centro de Eventos.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

alter table config add column if not exists datos_transferencia text default
'RUT: 76.672.268-7
Banco: Banco Santander
Cuenta: Cuenta Corriente
N° Cuenta: 73015359
Correo: vistasquillayquen@gmail.com';
