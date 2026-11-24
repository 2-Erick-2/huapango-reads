-- Guardado atómico desde el panel (ADR 0021): una obra con todas sus piezas y su primera versión, o
-- una pieza nueva en una obra existente. Corren con los permisos de quien llama (RLS aplica).

create function public.crear_obra(p_obra jsonb, p_piezas jsonb) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_obra uuid;
  v_pieza uuid;
  p jsonb;
  n integer := 0;
begin
  if not private.es_equipo() then
    raise exception 'Sin permiso para crear obras';
  end if;
  if jsonb_typeof(p_piezas) <> 'array' or jsonb_array_length(p_piezas) = 0 then
    raise exception 'La obra necesita al menos una pieza';
  end if;
  insert into public.obras (slug, tipo, titulo, autores, sinopsis, coleccion)
  values (
    p_obra ->> 'slug',
    (p_obra ->> 'tipo')::public.tipo_obra,
    p_obra ->> 'titulo',
    coalesce(array(select jsonb_array_elements_text(coalesce(p_obra -> 'autores', '[]'::jsonb))), '{}'),
    coalesce(p_obra ->> 'sinopsis', ''),
    nullif(p_obra ->> 'coleccion', '')
  )
  returning id into v_obra;

  for p in select value from jsonb_array_elements(p_piezas) loop
    insert into public.piezas (obra_id, slug, tipo, orden, titulo, firma)
    values (v_obra, p ->> 'slug', (p ->> 'tipo')::public.tipo_pieza, n, p ->> 'titulo', nullif(p ->> 'firma', ''))
    returning id into v_pieza;
    insert into public.versiones (pieza_id, documento, huella, nota)
    values (v_pieza, p -> 'documento', p ->> 'huella', p ->> 'nota');
    n := n + 1;
  end loop;
  return v_obra;
end $$;

create function public.agregar_pieza(p_obra uuid, p_pieza jsonb) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_pieza uuid;
  v_orden integer;
begin
  if not private.es_equipo() then
    raise exception 'Sin permiso para agregar piezas';
  end if;
  select coalesce(max(orden), -1) + 1 into v_orden from public.piezas where obra_id = p_obra;
  insert into public.piezas (obra_id, slug, tipo, orden, titulo, firma)
  values (p_obra, p_pieza ->> 'slug', (p_pieza ->> 'tipo')::public.tipo_pieza, v_orden, p_pieza ->> 'titulo', nullif(p_pieza ->> 'firma', ''))
  returning id into v_pieza;
  insert into public.versiones (pieza_id, documento, huella, nota)
  values (v_pieza, p_pieza -> 'documento', p_pieza ->> 'huella', p_pieza ->> 'nota');
  return v_pieza;
end $$;

revoke all on function public.crear_obra(jsonb, jsonb), public.agregar_pieza(uuid, jsonb) from public, anon;
grant execute on function public.crear_obra(jsonb, jsonb), public.agregar_pieza(uuid, jsonb) to authenticated;
