# ADR 0024 — Catálogo público en Supabase, cuentas de lectores, modo invitado y portadilla Tangerine

- **Estado:** Aceptado (2026-11-24)
- **Contexto:** Tras conectar el panel editorial y el taller de impresión a Supabase (ADR 0020–0023), faltaba reflejar los libros publicados desde `/panel` en el catálogo público (`/`, `/libro/[slug]`), poder editar su ficha comercial/editorial e inspeccionar versiones en el editor, autoalojar la fuente `Tangerine` para las portadillas en el lector y dar a los lectores un sistema de cuentas real con modo invitado y biblioteca personal.

## Decisiones

1. **Metadatos de catálogo y muestra segura (`20261124000007_catalogo_y_lectores.sql`):**
   - `public.obras` añade `subtitulo`, `generos`, `cita`, `precio_digital_mxn`, `isbn_digital` y `fecha_publicacion`, editables desde `/panel` (`EditarObraModal.tsx` → `actualizarDatosObra`).
   - El catálogo (`src/lib/catalog/index.ts#combinarCatalogo`) combina los libros curados locales con los libros publicados en Supabase sin romper portadas ni enlaces locales; si un libro nuevo en la nube no tiene portada ilustrada, `BookCover.tsx` renderiza una cubierta tipográfica con la paleta de papel.
   - Para libros publicados solo en la nube (sin archivos estáticos en `public/contenido/`), la función `public.muestra_libro(p_slug)` (`SECURITY DEFINER`) entrega únicamente los **primeros 4 bloques** y las imágenes firmadas correspondientes, sin exponer el libro completo antes de habilitar compras.

2. **Aislamiento entre lectores y equipo editorial (`src/lib/supabase/index.ts`, `src/lib/lector/cuenta.ts` y `registro-lector`):**
   - `lector()` usa `storageKey: "hr-lector-sesion"`, separada de `panel()` (`"hr-panel-sesion"`).
   - El acceso soporta **registro directo** (Edge Function `registro-lector`, con validación de entrada, perfil automático en `public.lectores` vía trigger `al_registrar_lector` ignorando `@panel.huapango.invalid` y sesión inmediata), **inicio de sesión** con correo y contraseña, y **Modo invitado** local (`hr:invitado`). Se omitió el acceso por enlace mágico para evitar depender de confirmación por correo en esta etapa.
   - Quienes inician sesión sincronizan su progreso de lectura en `public.progreso_lectura` (`upsert` por `lector_id, pieza_slug`) y lo ven en `/biblioteca` y en la marca de agua del lector.

3. **Historial de versiones y Tangerine autoalojada:**
   - `Tangerine-Regular.ttf` (OFL) queda autoalojada en `src/styles/fonts/tangerine-regular.ttf` (`--font-display` en `src/styles/app.css`); `Blocks.tsx` y `Reader.tsx` aplican el salto de columna tras la portadilla para mostrarla a página completa.
   - `PieceEditor.tsx` añade `HistorialModal.tsx` para revisar instantáneas guardadas (`listarVersiones`, `cargarVersion`) y restaurarlas como un nuevo borrador en el editor sin destruir la historia inmutable.

## Consecuencias

- Todo `.tsx` nuevo o modificado debe respetar tokens semánticos (`tema.test.ts`).
- El workflow de compras (Stripe/OXXO) queda preparado sobre `lectores` sin inventar compras ni reseñas reales todavía.
