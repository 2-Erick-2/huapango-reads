-- Blindaje del acceso al panel (revisión del 2026-11-24 sobre ADR 0020 y 0024).
--
-- Riesgo corregido: el registro público de lectores (Edge Function `registro-lector`) crea cuentas
-- ya confirmadas con CUALQUIER correo. Como el acceso al panel se daba solo porque el correo estaba en
-- `equipo_permitido`, cuando el equipo pase a correos reales alguien podría registrarse con el correo
-- de Dirección y recibir el rol de administración automáticamente.
--
-- Regla nueva: una cuenta recibe perfil del equipo solo si
--   1. su correo está confirmado, y
--   2. NO se creó desde el registro público (app_metadata.origen = 'registro-lector', que solo
--      puede escribir el servidor).

create or replace function private.puede_ser_equipo(u auth.users) returns boolean
language sql stable security definer set search_path = ''
as $$
  select u.email_confirmed_at is not null
     and coalesce(u.raw_app_meta_data ->> 'origen', '') <> 'registro-lector'
$$;
revoke all on function private.puede_ser_equipo(auth.users) from public;

create or replace function private.crear_perfil_de_usuario() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare permitido public.equipo_permitido;
begin
  if not private.puede_ser_equipo(new) then
    return new;
  end if;
  select * into permitido from public.equipo_permitido where email = lower(new.email);
  if found then
    insert into public.perfiles (id, email, nombre, rol)
    values (new.id, lower(new.email), permitido.nombre, permitido.rol)
    on conflict (id) do update set rol = excluded.rol, nombre = excluded.nombre;
  end if;
  return new;
end $$;

create or replace function private.sincronizar_perfil_permitido() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.perfiles where email = old.email;
    return old;
  end if;
  insert into public.perfiles (id, email, nombre, rol)
  select u.id, lower(u.email), new.nombre, new.rol
  from auth.users u
  where lower(u.email) = new.email and private.puede_ser_equipo(u)
  on conflict (id) do update set rol = excluded.rol, nombre = excluded.nombre;
  return new;
end $$;
