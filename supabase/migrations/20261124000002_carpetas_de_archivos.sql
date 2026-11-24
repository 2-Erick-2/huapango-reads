-- Carpetas de archivos del panel (ADR 0020).
-- originales: EPUB/PDF/Word que sube la editorial (privada).
-- imagenes:   ilustraciones y viñetas de las obras (privada hasta que el lector sirva URLs firmadas).
-- portadas:   portadas del catálogo (pública: el sitio las muestra).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('originales', 'originales', false, 52428800,
   array['application/epub+zip', 'application/pdf',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('imagenes', 'imagenes', false, 15728640,
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('portadas', 'portadas', true, 10485760,
   array['image/jpeg', 'image/png', 'image/webp']);

create policy "el equipo ve los archivos del panel" on storage.objects
  for select to authenticated
  using (bucket_id in ('originales', 'imagenes', 'portadas') and (select private.es_equipo()));

create policy "el equipo sube archivos del panel" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('originales', 'imagenes', 'portadas') and (select private.es_equipo()));

create policy "el equipo reemplaza archivos del panel" on storage.objects
  for update to authenticated
  using (bucket_id in ('originales', 'imagenes', 'portadas') and (select private.es_equipo()))
  with check (bucket_id in ('originales', 'imagenes', 'portadas') and (select private.es_equipo()));

create policy "administración borra archivos del panel" on storage.objects
  for delete to authenticated
  using (bucket_id in ('originales', 'imagenes', 'portadas') and (select private.es_admin()));
