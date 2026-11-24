-- Una sola política de lectura por tabla y rol (evita evaluar dos políticas permisivas por fila).
-- Se modifican las políticas existentes (alter) en lugar de borrarlas y recrearlas.

alter policy "cualquiera ve las obras publicadas" on public.obras to anon;
alter policy "cualquiera ve las obras publicadas" on public.obras rename to "lectores ven lo publicado";
alter policy "el equipo ve todas las obras" on public.obras
  using (estado = 'publicada' or (select private.es_equipo()));
alter policy "el equipo ve todas las obras" on public.obras rename to "equipo ve todo y lectores lo publicado";

alter policy "cualquiera ve las piezas de obras publicadas" on public.piezas to anon;
alter policy "cualquiera ve las piezas de obras publicadas" on public.piezas rename to "lectores ven piezas publicadas";
alter policy "el equipo ve las piezas" on public.piezas
  using ((select private.es_equipo())
         or exists (select 1 from public.obras o where o.id = obra_id and o.estado = 'publicada'));
alter policy "el equipo ve las piezas" on public.piezas rename to "equipo ve todo y lectores lo publicado";

alter policy "cualquiera lee los ensayos publicados" on public.versiones to anon;
alter policy "cualquiera lee los ensayos publicados" on public.versiones rename to "lectores leen ensayos publicados";
alter policy "el equipo ve las versiones" on public.versiones
  using (
    (select private.es_equipo())
    or exists (select 1 from public.piezas p join public.obras o on o.id = p.obra_id
               where p.version_publicada = versiones.id and o.estado = 'publicada' and o.tipo = 'ensayo'));
alter policy "el equipo ve las versiones" on public.versiones rename to "equipo ve todo y lectores los ensayos publicados";
