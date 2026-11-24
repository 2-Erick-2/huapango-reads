-- Esquema del panel de la editorial (ADR 0020): equipo y roles, obras, piezas, versiones inmutables,
-- archivos, importaciones e historial. Seguridad por filas (RLS) en todas las tablas.
-- Roles: 'admin' (único que publica) y 'editor'. Solo entra quien está en equipo_permitido.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon;

-- ---------------------------------------------------------------- tipos
create type public.rol_equipo as enum ('admin', 'editor');
create type public.tipo_obra as enum ('libro', 'ensayo');
create type public.tipo_pieza as enum ('libro', 'complemento', 'ensayo');
create type public.estado_obra as enum ('borrador', 'publicada', 'retirada');
create type public.estado_importacion as enum ('pendiente', 'revisada', 'aplicada', 'fallida');

-- ---------------------------------------------------------------- equipo
create table public.equipo_permitido (
  email text primary key check (email = lower(trim(email)) and email like '%@%'),
  nombre text not null check (length(trim(nombre)) > 0),
  rol public.rol_equipo not null,
  creado_en timestamptz not null default now()
);
comment on table public.equipo_permitido is 'Correos autorizados a entrar al panel y su rol. Solo administración.';

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nombre text not null,
  rol public.rol_equipo not null,
  creado_en timestamptz not null default now()
);
comment on table public.perfiles is 'Personas del equipo con acceso al panel (se crean solas al registrarse un correo autorizado).';

-- Rol de quien hace la petición (null si no es del equipo). security definer: lee perfiles sin RLS.
create function private.rol_actual() returns public.rol_equipo
language sql stable security definer set search_path = ''
as $$ select rol from public.perfiles where id = (select auth.uid()) $$;

create function private.es_equipo() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.rol_actual() is not null $$;

create function private.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(private.rol_actual() = 'admin', false) $$;

revoke all on function private.rol_actual(), private.es_equipo(), private.es_admin() from public;
grant execute on function private.rol_actual(), private.es_equipo(), private.es_admin() to authenticated, anon;

-- Alta automática del perfil: al registrarse un correo autorizado, o al autorizar un correo ya registrado.
create function private.crear_perfil_de_usuario() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare permitido public.equipo_permitido;
begin
  select * into permitido from public.equipo_permitido where email = lower(new.email);
  if found then
    insert into public.perfiles (id, email, nombre, rol)
    values (new.id, lower(new.email), permitido.nombre, permitido.rol)
    on conflict (id) do update set rol = excluded.rol, nombre = excluded.nombre;
  end if;
  return new;
end $$;

create trigger al_registrar_usuario
after insert on auth.users
for each row execute function private.crear_perfil_de_usuario();

create function private.sincronizar_perfil_permitido() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.perfiles where email = old.email;
    return old;
  end if;
  insert into public.perfiles (id, email, nombre, rol)
  select u.id, lower(u.email), new.nombre, new.rol from auth.users u where lower(u.email) = new.email
  on conflict (id) do update set rol = excluded.rol, nombre = excluded.nombre;
  return new;
end $$;

create trigger al_cambiar_equipo
after insert or update or delete on public.equipo_permitido
for each row execute function private.sincronizar_perfil_permitido();

-- ---------------------------------------------------------------- utilidades
create function private.tocar_actualizado() returns trigger
language plpgsql set search_path = ''
as $$ begin new.actualizado_en = now(); return new; end $$;

create table public.historial (
  id bigint generated always as identity primary key,
  quien uuid references public.perfiles (id) on delete set null,
  accion text not null,
  obra_id uuid,
  detalle jsonb not null default '{}'::jsonb,
  cuando timestamptz not null default now()
);
comment on table public.historial is 'Quién hizo qué y cuándo. Solo se escribe desde funciones del servidor.';
create index historial_obra_idx on public.historial (obra_id, cuando desc);
create index historial_quien_idx on public.historial (quien);

create function private.registrar(p_accion text, p_obra uuid, p_detalle jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = ''
as $$
  insert into public.historial (quien, accion, obra_id, detalle)
  values ((select auth.uid()), p_accion, p_obra, coalesce(p_detalle, '{}'::jsonb))
$$;
revoke all on function private.registrar(text, uuid, jsonb) from public;

-- ---------------------------------------------------------------- obras
create table public.obras (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tipo public.tipo_obra not null,
  titulo text not null check (length(trim(titulo)) > 0),
  autores text[] not null default '{}',
  sinopsis text not null default '',
  coleccion text,
  portada_ruta text,
  estado public.estado_obra not null default 'borrador',
  publicada_en timestamptz,
  creado_por uuid references public.perfiles (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on column public.obras.portada_ruta is 'Ruta dentro de la carpeta de archivos "portadas".';
create index obras_creado_por_idx on public.obras (creado_por);
create index obras_estado_idx on public.obras (estado);

create trigger obras_actualizado before update on public.obras
for each row execute function private.tocar_actualizado();

-- Solo administración publica o retira (las funciones del servidor, sin usuario, sí pueden).
create function private.proteger_obra() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and new.estado is distinct from old.estado
     and not private.es_admin() then
    raise exception 'Solo la administración puede publicar o retirar una obra';
  end if;
  if new.estado is distinct from old.estado then
    perform private.registrar(
      case new.estado when 'publicada' then 'publicó' when 'retirada' then 'retiró' else 'pasó a borrador' end,
      new.id, jsonb_build_object('titulo', new.titulo));
  end if;
  return new;
end $$;
create trigger obras_proteger before update on public.obras
for each row execute function private.proteger_obra();

create function private.registrar_obra() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.registrar('creó', new.id, jsonb_build_object('titulo', new.titulo, 'tipo', new.tipo));
    return new;
  end if;
  perform private.registrar('borró', old.id, jsonb_build_object('titulo', old.titulo));
  return old;
end $$;
create trigger obras_registrar after insert or delete on public.obras
for each row execute function private.registrar_obra();

-- ---------------------------------------------------------------- piezas y versiones
create table public.piezas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tipo public.tipo_pieza not null,
  orden integer not null check (orden >= 0),
  titulo text not null check (length(trim(titulo)) > 0),
  firma text,
  version_vigente uuid,
  version_publicada uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (obra_id, orden) deferrable initially deferred
);
create index piezas_obra_idx on public.piezas (obra_id);

create trigger piezas_actualizado before update on public.piezas
for each row execute function private.tocar_actualizado();

create table public.versiones (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid not null references public.piezas (id) on delete cascade,
  numero integer not null default 0,
  documento jsonb not null check (jsonb_typeof(documento) = 'object' and documento ->> 'version' = '1'),
  huella text not null,
  nota text,
  creado_por uuid references public.perfiles (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  unique (pieza_id, numero)
);
comment on table public.versiones is 'Cada guardado de una pieza (documento en formato canónico v1). Inmutables.';
create index versiones_pieza_idx on public.versiones (pieza_id, numero desc);
create index versiones_creado_por_idx on public.versiones (creado_por);

alter table public.piezas
  add constraint piezas_version_vigente_fk foreign key (version_vigente) references public.versiones (id) on delete set null,
  add constraint piezas_version_publicada_fk foreign key (version_publicada) references public.versiones (id) on delete set null;
create index piezas_version_vigente_idx on public.piezas (version_vigente);
create index piezas_version_publicada_idx on public.piezas (version_publicada);

-- Número consecutivo por pieza y, al guardar, la nueva versión pasa a ser la vigente.
create function private.numerar_version() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.piezas where id = new.pieza_id for update;
  select coalesce(max(numero), 0) + 1 into new.numero from public.versiones where pieza_id = new.pieza_id;
  return new;
end $$;
create trigger versiones_numerar before insert on public.versiones
for each row execute function private.numerar_version();

create function private.activar_version() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.piezas set version_vigente = new.id where id = new.pieza_id;
  return new;
end $$;
create trigger versiones_activar after insert on public.versiones
for each row execute function private.activar_version();

-- Las versiones no se editan ni se borran (salvo al borrar su pieza).
create function private.versiones_inmutables() returns trigger
language plpgsql set search_path = ''
as $$ begin raise exception 'Las versiones guardadas no se modifican'; end $$;
create trigger versiones_sin_cambios before update on public.versiones
for each row execute function private.versiones_inmutables();

-- Solo administración cambia lo publicado de una pieza.
create function private.proteger_pieza() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and new.version_publicada is distinct from old.version_publicada
     and not private.es_admin() then
    raise exception 'Solo la administración puede publicar';
  end if;
  return new;
end $$;
create trigger piezas_proteger before update on public.piezas
for each row execute function private.proteger_pieza();

-- ---------------------------------------------------------------- archivos e importaciones
create table public.archivos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras (id) on delete cascade,
  carpeta text not null check (carpeta in ('originales', 'imagenes', 'portadas')),
  ruta text not null,
  nombre_original text,
  tipo_mime text not null,
  bytes bigint not null check (bytes >= 0),
  sha256 text,
  ancho integer,
  alto integer,
  alt text not null default '',
  subido_por uuid references public.perfiles (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  unique (carpeta, ruta)
);
create index archivos_obra_idx on public.archivos (obra_id);
create index archivos_subido_por_idx on public.archivos (subido_por);

create table public.importaciones (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras (id) on delete set null,
  archivo_id uuid references public.archivos (id) on delete set null,
  estado public.estado_importacion not null default 'pendiente',
  mapeo jsonb,
  informe jsonb,
  creado_por uuid references public.perfiles (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index importaciones_obra_idx on public.importaciones (obra_id);
create index importaciones_archivo_idx on public.importaciones (archivo_id);
create index importaciones_creado_por_idx on public.importaciones (creado_por);
create trigger importaciones_actualizado before update on public.importaciones
for each row execute function private.tocar_actualizado();

-- ---------------------------------------------------------------- publicar
create function public.publicar_obra(p_obra uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not private.es_admin() then
    raise exception 'Solo la administración puede publicar';
  end if;
  if not exists (select 1 from public.piezas where obra_id = p_obra) then
    raise exception 'La obra no tiene piezas';
  end if;
  if exists (select 1 from public.piezas where obra_id = p_obra and version_vigente is null) then
    raise exception 'Hay piezas sin contenido guardado';
  end if;
  update public.piezas set version_publicada = version_vigente where obra_id = p_obra;
  update public.obras set estado = 'publicada', publicada_en = now() where id = p_obra;
end $$;
revoke all on function public.publicar_obra(uuid) from public, anon;
grant execute on function public.publicar_obra(uuid) to authenticated;

-- ---------------------------------------------------------------- seguridad por filas
alter table public.equipo_permitido enable row level security;
alter table public.perfiles enable row level security;
alter table public.historial enable row level security;
alter table public.obras enable row level security;
alter table public.piezas enable row level security;
alter table public.versiones enable row level security;
alter table public.archivos enable row level security;
alter table public.importaciones enable row level security;

-- equipo_permitido: solo administración
create policy "administración ve el equipo autorizado" on public.equipo_permitido
  for select to authenticated using ((select private.es_admin()));
create policy "administración autoriza correos" on public.equipo_permitido
  for insert to authenticated with check ((select private.es_admin()));
create policy "administración cambia autorizaciones" on public.equipo_permitido
  for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "administración quita autorizaciones" on public.equipo_permitido
  for delete to authenticated using ((select private.es_admin()));

-- perfiles: el equipo se ve entre sí; los perfiles se crean y cambian solo desde equipo_permitido
create policy "el equipo ve los perfiles" on public.perfiles
  for select to authenticated using ((select private.es_equipo()));

-- historial: lectura del equipo (se escribe desde funciones del servidor)
create policy "el equipo ve el historial" on public.historial
  for select to authenticated using ((select private.es_equipo()));

-- obras
create policy "el equipo ve todas las obras" on public.obras
  for select to authenticated using ((select private.es_equipo()));
create policy "cualquiera ve las obras publicadas" on public.obras
  for select to anon, authenticated using (estado = 'publicada');
create policy "el equipo crea obras" on public.obras
  for insert to authenticated with check ((select private.es_equipo()) and estado = 'borrador');
create policy "el equipo edita obras" on public.obras
  for update to authenticated using ((select private.es_equipo())) with check ((select private.es_equipo()));
create policy "administración borra obras" on public.obras
  for delete to authenticated using ((select private.es_admin()));

-- piezas
create policy "el equipo ve las piezas" on public.piezas
  for select to authenticated using ((select private.es_equipo()));
create policy "cualquiera ve las piezas de obras publicadas" on public.piezas
  for select to anon, authenticated
  using (exists (select 1 from public.obras o where o.id = obra_id and o.estado = 'publicada'));
create policy "el equipo crea piezas" on public.piezas
  for insert to authenticated with check ((select private.es_equipo()) and version_publicada is null);
create policy "el equipo edita piezas" on public.piezas
  for update to authenticated using ((select private.es_equipo())) with check ((select private.es_equipo()));
create policy "el equipo borra piezas de obras en borrador" on public.piezas
  for delete to authenticated using (
    (select private.es_admin())
    or ((select private.es_equipo())
        and exists (select 1 from public.obras o where o.id = obra_id and o.estado = 'borrador'))
  );

-- versiones: se agregan, no se editan ni se borran
create policy "el equipo ve las versiones" on public.versiones
  for select to authenticated using ((select private.es_equipo()));
create policy "cualquiera lee los ensayos publicados" on public.versiones
  for select to anon, authenticated using (
    exists (
      select 1 from public.piezas p join public.obras o on o.id = p.obra_id
      where p.version_publicada = versiones.id and o.estado = 'publicada' and o.tipo = 'ensayo'
    )
  );
create policy "el equipo guarda versiones" on public.versiones
  for insert to authenticated with check ((select private.es_equipo()));

-- archivos
create policy "el equipo ve los archivos" on public.archivos
  for select to authenticated using ((select private.es_equipo()));
create policy "el equipo registra archivos" on public.archivos
  for insert to authenticated with check ((select private.es_equipo()));
create policy "el equipo edita archivos" on public.archivos
  for update to authenticated using ((select private.es_equipo())) with check ((select private.es_equipo()));
create policy "administración borra archivos" on public.archivos
  for delete to authenticated using ((select private.es_admin()));

-- importaciones
create policy "el equipo ve las importaciones" on public.importaciones
  for select to authenticated using ((select private.es_equipo()));
create policy "el equipo crea importaciones" on public.importaciones
  for insert to authenticated with check ((select private.es_equipo()));
create policy "el equipo actualiza importaciones" on public.importaciones
  for update to authenticated using ((select private.es_equipo())) with check ((select private.es_equipo()));
