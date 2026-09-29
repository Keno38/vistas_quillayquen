-- Migración 009: un solo sistema de login (usuario/clave), con roles.
-- Reemplaza el login separado con Supabase Authentication del panel de
-- Contenido: ahora todo el mundo entra por /admin.html, y lo que ve depende
-- de su rol en admin_usuarios.
--   - rol 'agenda'  → solo Solicitudes y Reservas (como hasta ahora).
--   - rol 'general' → todo: agenda + Contenido (precios, menú, galería, hero, reels).
-- Ejecutar una sola vez en el SQL Editor de Supabase.

alter table admin_usuarios add column if not exists rol text not null default 'agenda'
  check (rol in ('agenda', 'general'));

-- El usuario "admin" que ya existe sigue viendo solo la agenda, sin cambios.
update admin_usuarios set rol = 'agenda' where usuario = 'admin';

-- Usuario nuevo para el rol general (precios, menú, galería, hero, reels y agenda).
-- Usuario: general   Contraseña: general2026  (cámbiala luego si quieres, ver README.md)
insert into admin_usuarios (usuario, salt, password_hash, rol) values (
  'general',
  '5fc73ec61def3d0bbcf26b499797496e',
  '7c60ef2d5c41915f2979d93f4388924bdb1cdd2b2f02f61cbf9106f7ebd6a024',
  'general'
) on conflict (usuario) do nothing;
