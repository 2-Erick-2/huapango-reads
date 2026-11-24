# 0023 — PDF de imprenta en el servidor con Typst WASM, `droplet` y `pdf-lib`

- **Fecha:** 2026-11-24
- **Estado:** Aceptada (implementada y probada en servidor y pruebas unitarias/integración; pendiente prueba física en impresora)
- **Decide:** Erick (plan en `docs/analisis/2026-11-24-modo-dia-y-pdf-de-imprenta.md`)

## Contexto

La pestaña de impresión en la vista previa del panel (`PrintPreview.tsx`) es solo una aproximación visual en pantalla, mientras que el taller real calibrado contra `EL_PRINCIPE_FELIZ_22OCTUBRE2026.pdf` vivía en `prototipos/taller-impresion/` usando Python, Typst CLI y `libro.json` viejo. Además, en la máquina de desarrollo los binarios nativos externos están bloqueados (ADR 0017), por lo que el servidor de la app no puede depender de `typst` ni `python` instalados en el sistema.

## Decisión

1. **Compilador en WebAssembly dentro de Node (`src/server/imprenta/`):**
   - `@myriaddreamin/typst.ts` `0.7.0` y `@myriaddreamin/typst-ts-web-compiler` `0.7.0` (versiones exactas).
   - `pdf-lib` `1.17.1` para contar páginas e imponer en folleto (`folleto.ts`, portado de `imponer_folleto.py` con compensación opcional de _creep_).
2. **Plantilla calibrada sobre el formato canónico v1:**
   - `libro.ts` transforma `Pieza[]` en `DatosLibro` (orden `ordenDeImpresion`, medidas en caja de 5.5 × 8.5 in, alerta `< 300` ppp y propuesta de página legal).
   - `plantilla-libro.typ` reproduce las medidas reales (Libertinus Serif 14/18 pt, cornisas al 78 % K, texto en 100 % K sin negro enriquecido, apertura impar, portadillas y página legal).
   - Fuentes libres OFL autoalojadas en `src/server/imprenta/fuentes/` (`Libertinus Serif` 7.051 y `Tangerine`) y paquete local `src/server/imprenta/droplet/` para la capitular descolgada de 3 líneas.
   - `compilar.ts` compila en dos pasadas (primero mide el texto y luego rellena las páginas blancas hasta múltiplo de 4 para que el colofón quede en la última página), serializando las llamadas sobre el compilador WASM.
3. **API, UI del panel y almacenamiento en Supabase:**
   - Endpoint `POST /api/panel/imprimir` (`src/routes/api/panel/imprimir.ts`, `src/server/imprenta/exportar.ts`), protegido por `PANEL_ENABLED` y sesión del equipo (`src/server/panel-auth.ts`).
   - Modal `ImprimirModal.tsx` accesible desde cada obra en `/panel` (tanto obras en Supabase como obras de la demostración): elige entre **Media carta** (flujo con Adobe Acrobat) o **Folleto listo en hojas carta**, márgenes **Clásico Huapango** (idéntico al impreso) o **Aprovechar más la hoja** (compacto), edición de legal/colofón, división silábica opcional y reporte previo de páginas y avisos de resolución.
   - Carpeta privada `impresion` en Supabase Storage y actualización de `public.archivos` (`supabase/migrations/20261124000006_carpeta_impresion.sql`).

## Alternativas consideradas

- **Invocar `typst` y `python` nativos desde Node:** descartado porque los binarios nativos están bloqueados en el entorno de desarrollo (ADR 0017) y complicaría el despliegue futuro.
- **Imprimir desde Chromium (`window.print` / Playwright PDF):** descartado porque no controla negro puro `cmyk(0%, 0%, 0%, 100%)`, cornisas por paridad, apertura impar ni imposición exacta en folleto.

## Consecuencias

- El equipo ya puede descargar desde el panel PDFs listos para imprimir sin instalar Python ni Typst ni salir del navegador.
- **Pendiente para cerrar la Fase 0 física:** confirmación de impresora/papel/calibre de la editorial, prueba física impresa comparada con el libro real, portada extendida con lomo/EAN-13 en JS y opción PDF/X CMYK si contratan imprenta externa.
