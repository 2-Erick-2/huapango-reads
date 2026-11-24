-- Metadatos de catálogo público en obras, muestra segura para libros publicados en el panel,
-- cuentas de lectores y sincronización de progreso de lectura.

-- ---------------------------------------------------------------- catálogo en obras
alter table public.obras
  add column if not exists subtitulo text,
  add column if not exists generos text[] not null default '{}',
  add column if not exists cita text,
  add column if not exists precio_digital_mxn integer check (precio_digital_mxn is null or precio_digital_mxn >= 0),
  add column if not exists isbn_digital text,
  add column if not exists fecha_publicacion date;

-- Muestra pública segura (solo los primeros 4 bloques de un libro publicado desde el panel;
-- nunca expone el libro completo antes de la compra).
create or replace function public.muestra_libro(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'obra', o.slug,
    'titulo', o.titulo,
    'autores', o.autores,
    'pieza', jsonb_build_object(
      'version', 1,
      'slug', p.slug,
      'kind', p.tipo,
      'parentSlug', null,
      'title', p.titulo,
      'credit', p.firma,
      'language', 'es-MX',
      'blocks', coalesce(
        (select jsonb_agg(b order by ord)
         from jsonb_array_elements(v.documento -> 'blocks') with ordinality as t(b, ord)
         where ord <= 4),
        '[]'::jsonb
      ),
      'stats', v.documento -> 'stats'
    )
  )
  from public.obras o
  join public.piezas p on p.obra_id = o.id and p.tipo = 'libro'
  join public.versiones v on v.id = p.version_publicada
  where o.slug = p_slug
    and o.tipo = 'libro'
    and o.estado = 'publicada'
  order by p.orden asc
  limit 1;
$$;

revoke all on function public.muestra_libro(text) from public;
grant execute on function public.muestra_libro(text) to anon, authenticated;

-- ---------------------------------------------------------------- cuentas de lectores
create table if not exists public.lectores (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.lectores is 'Lectores registrados en Huapango +reads (separado de perfiles del equipo editorial).';

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'lectores_actualizado') then
    create trigger lectores_actualizado before update on public.lectores
    for each row execute function private.tocar_actualizado();
  end if;
end $$;

create or replace function private.crear_lector_de_usuario() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_nombre text;
begin
  if coalesce(new.email, '') = '' or lower(new.email) like '%@panel.huapango.invalid' then
    return new;
  end if;
  v_nombre := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Lector'
  );
  insert into public.lectores (id, nombre)
  values (new.id, v_nombre)
  on conflict (id) do nothing;
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'al_registrar_lector') then
    create trigger al_registrar_lector
    after insert on auth.users
    for each row execute function private.crear_lector_de_usuario();
  end if;
end $$;

alter table public.lectores enable row level security;

create policy "cada lector ve su cuenta" on public.lectores
  for select to authenticated using ((select auth.uid()) = id);
create policy "cada lector crea su cuenta" on public.lectores
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "cada lector edita su cuenta" on public.lectores
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------- progreso de lectura sincronizado
create table if not exists public.progreso_lectura (
  lector_id uuid not null references public.lectores (id) on delete cascade default auth.uid(),
  obra_slug text not null,
  pieza_slug text not null,
  ratio double precision not null check (ratio >= 0 and ratio <= 1),
  actualizado_en timestamptz not null default now(),
  primary key (lector_id, pieza_slug)
);
create index if not exists progreso_lectura_obra_idx on public.progreso_lectura (lector_id, obra_slug);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'progreso_lectura_actualizado') then
    create trigger progreso_lectura_actualizado before update on public.progreso_lectura
    for each row execute function private.tocar_actualizado();
  end if;
end $$;

alter table public.progreso_lectura enable row level security;

create policy "cada lector ve su progreso" on public.progreso_lectura
  for select to authenticated using ((select auth.uid()) = lector_id);
create policy "cada lector guarda su progreso" on public.progreso_lectura
  for insert to authenticated with check ((select auth.uid()) = lector_id);
create policy "cada lector actualiza su progreso" on public.progreso_lectura
  for update to authenticated using ((select auth.uid()) = lector_id) with check ((select auth.uid()) = lector_id);
create policy "cada lector borra su progreso" on public.progreso_lectura
  for delete to authenticated using ((select auth.uid()) = lector_id);
