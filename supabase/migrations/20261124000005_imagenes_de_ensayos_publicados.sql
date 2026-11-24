-- Los lectores (sin cuenta) pueden pedir enlaces temporales de las imágenes de un ensayo publicado.
-- Las imágenes de libros de pago siguen privadas.
create policy "lectores ven imágenes de ensayos publicados" on storage.objects
  for select to anon
  using (
    bucket_id = 'imagenes'
    and exists (
      select 1 from public.obras o
      where o.slug = (storage.foldername(name))[1] and o.tipo = 'ensayo' and o.estado = 'publicada'
    )
  );
