-- Migración 006: el menú pasa de 2 a 3 categorías independientes:
-- desayuno, almuerzo y once. Un evento puede elegir un menú de cada una.
-- Ejecutar una sola vez en el SQL Editor de Supabase (después de la 005).

-- 1) Renombrar la columna de eventos que guardaba el menú "tarde" a "almuerzo".
alter table eventos rename column menu_tarde_id to menu_almuerzo_id;
alter table eventos add column if not exists menu_once_id integer references menu_opciones(id);

-- 2) Las opciones que ya existían con categoría "tarde" pasan a "almuerzo"
-- por defecto (son comidas completas, no colaciones de once); se pueden
-- reasignar a "once" a mano desde el panel de Contenido si corresponde.
alter table menu_opciones drop constraint if exists menu_opciones_categoria_check;
update menu_opciones set categoria = 'almuerzo' where categoria = 'tarde';
alter table menu_opciones alter column categoria set default 'almuerzo';
alter table menu_opciones add constraint menu_opciones_categoria_check
  check (categoria in ('desayuno', 'almuerzo', 'once'));
