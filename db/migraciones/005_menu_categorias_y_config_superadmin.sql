-- Migración 005:
-- Las opciones de menú se dividen en dos categorías (desayuno / tarde) y
-- un evento puede elegir un menú de cada una, independientemente.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

alter table menu_opciones add column if not exists categoria text not null default 'tarde'
  check (categoria in ('desayuno', 'tarde'));

alter table eventos add column if not exists menu_desayuno_id integer references menu_opciones(id);
alter table eventos add column if not exists menu_tarde_id integer references menu_opciones(id);

update menu_opciones set categoria = 'tarde' where categoria is null;
