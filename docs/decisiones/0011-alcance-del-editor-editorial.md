# 0011 — Alcance del "editor tipo InDesign": taller editorial estructurado, no clon

- **Fecha:** 2026-11-23
- **Estado:** Reemplazada por 0013 (2026-11-23): Erick decidió construir el taller completo con PDF de imprenta
- **Decide:** Erick / Editorial Huapango

## Contexto

Erick les ofreció a los dueños de la editorial un editor "como InDesign" dentro de su plataforma, para crear sus libros, exportarlos, usarlos en +reads y dejar de pagar Adobe. +reads todavía no está en producción (no tiene login, pagos ni contenido real). Análisis completo: [`docs/analisis/2026-11-23-editor-tipo-indesign.md`](../analisis/2026-11-23-editor-tipo-indesign.md).

## Decisión (recomendada)

- **No construir un clon de InDesign** (maqueta libre, PDF/X, CMYK, composición tipo Knuth-Plass). No es viable para una persona y tiene riesgo alto en imprenta.
- **Sí construir, por fases y después de lanzar +reads, un "taller editorial" estructurado**:
  - Un editor de bloques (ProseMirror o el núcleo de Tiptap, sin React) sobre el formato canónico del ADR 0010.
  - Plantillas por colección.
  - Salidas al lector, a EPUB 3 y, opcionalmente, a PDF de imprenta (Paged.js, Vivliostyle o Typst).
- **Cotizarlo aparte** del contrato de +reads.
- Para portadas e ilustrados, recomendar una herramienta gratuita (Affinity o Scribus; verificar licencia vigente) en lugar de desarrollarla.

## Alternativas consideradas

- **Clon de InDesign:** descartado por costo (años), riesgo (errores de imprenta) y distracción del producto principal.
- **No hacer nada y seguir con InDesign:** válido, pero mantiene la dependencia de Adobe y los EPUB defectuosos.
- **Herramientas existentes (Vellum, Atticus, Affinity, Scribus):** resuelven el "no pagar Adobe" desde hoy sin desarrollo. Pueden convivir con el taller.

## Consecuencias

- El taller reutiliza la ingesta y el formato canónico que +reads necesita de todos modos.
- Hay que **reencuadrar la expectativa del cliente** ("no es un InDesign") antes de comprometer fechas.
- El PDF de imprenta solo se promete después de validarlo con la imprenta real.
