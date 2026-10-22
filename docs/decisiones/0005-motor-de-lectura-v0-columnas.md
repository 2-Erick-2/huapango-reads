# 0005 — Motor de lectura v0: paginación por columnas CSS

- **Fecha:** 2026-10-22
- **Estado:** Aceptada (para el demo). Se revisará en el Hito 2.
- **Decide:** recomendación técnica

## Contexto

Para el demo se necesita un lector funcional antes de tener el Word de los libros. El prototipo anterior (`huapangoread`, React) dibujaba 9 páginas a mano: no repaginaba al cambiar la letra y los subrayados se rompían.

## Decisión

- **Paginador propio** (`src/lib/reader/pagination.ts` + `src/components/reader/Reader.tsx`). El texto fluye en columnas CSS de alto fijo; cada columna es una página. Pliego de 2 páginas desde 900 px de ancho útil, 1 página en pantallas angostas.
- **Repaginación** al cambiar el tamaño de letra o la ventana, conservando la posición proporcional.
- **Contenido estructurado** (capítulos → párrafos) en `ReadableText`. Hoy es un texto de demostración; en el Hito 2 vendrá del proceso Word → EPUB.
- **Lógica pura con pruebas** en Vitest; la interacción se probó con Playwright (ver bitácora del 2026-10-22).

## Alternativas consideradas

- **foliate-js de entrada:** renderiza EPUB y CFI, pero sin EPUB real todavía añade complejidad (iframes, guardarlo en el repo) sin beneficio para el demo. **Se evaluará en el Hito 2** con EPUB reales.
- **Páginas escritas a mano (como el prototipo):** descartado; no escala ni repagina.
- **epub.js:** con poco mantenimiento.

## Consecuencias

- Aún no hay subrayados ni anclas tipo CFI: llegan con el contenido real.
- Si se adopta foliate-js en el Hito 2, la interfaz del lector (barras, temas, gestos) se conserva; solo cambia el render del texto.
