-- Migración 004: contenido editable del Centro de Eventos (capacidad,
-- servicios, contacto) y opciones de menú administrables por separado.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

alter table config add column if not exists eventos_capacidad text
  default 'Hasta 80 personas en el salón techado, más la terraza y el área de piscina.';
alter table config add column if not exists eventos_servicios text
  default 'Salón techado, piscina, mesas y sillas, estacionamiento.';
alter table config add column if not exists eventos_contacto text
  default 'Coordina tu evento eligiendo una fecha libre en el calendario. Te contactamos por teléfono/WhatsApp para confirmar los detalles y el pago.';

create table if not exists menu_opciones (
  id serial primary key,
  nombre text not null,
  precio_por_persona integer,
  activo boolean not null default true,
  orden integer not null default 0
);

alter table menu_opciones enable row level security;

insert into menu_opciones (nombre, precio_por_persona, orden)
select 'Pollo con papas fritas y ensaladas', null, 1
where not exists (select 1 from menu_opciones);

alter table eventos add column if not exists menu_opcion_id integer references menu_opciones(id);
