-- Carpeta privada para los PDF listos para imprimir (ADR 0023).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('impresion', 'impresion', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

alter table public.archivos
  drop constraint if exists archivos_carpeta_check,
  add constraint archivos_carpeta_check
    check (carpeta in ('originales', 'imagenes', 'portadas', 'impresion'));

alter policy "el equipo ve los archivos del panel" on storage.objects
  using (bucket_id in ('originales', 'imagenes', 'portadas', 'impresion') and (select private.es_equipo()));

alter policy "el equipo sube archivos del panel" on storage.objects
  with check (bucket_id in ('originales', 'imagenes', 'portadas', 'impresion') and (select private.es_equipo()));

alter policy "el equipo reemplaza archivos del panel" on storage.objects
  using (bucket_id in ('originales', 'imagenes', 'portadas', 'impresion') and (select private.es_equipo()))
  with check (bucket_id in ('originales', 'imagenes', 'portadas', 'impresion') and (select private.es_equipo()));

alter policy "administración borra archivos del panel" on storage.objects
  using (bucket_id in ('originales', 'imagenes', 'portadas', 'impresion') and (select private.es_admin()));
