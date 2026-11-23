# 0010 — Ingesta: EPUB/Word de la editorial → formato canónico de bloques

- **Fecha:** 2026-11-23
- **Estado:** Aceptada (2026-11-23, como base del taller editorial, ADR 0013). Corrección: el prólogo y la nota **no se unen** al libro; son minilibros (ADR 0012)
- **Decide:** Erick, con recomendación técnica

## Contexto

La editorial mandó los primeros EPUB reales (_El príncipe feliz_, en 3 archivos). Vienen exportados de InDesign 21.6, sin semántica, con estilos locales que cambian de nombre entre archivos, fuentes ofuscadas (algunas comerciales), color negro fijo, la portada rasterizada desde la página 1 y un colofón de imprenta. Análisis completo: [`docs/analisis/2026-11-23-epub-el-principe-feliz.md`](../analisis/2026-11-23-epub-el-principe-feliz.md).

El ROADMAP preveía "Word → EPUB (Pandoc)" y evaluar foliate-js (ADR 0005). El material real llega como EPUB de InDesign, no como Word.

## Decisión

- +reads **no sirve los EPUB de la editorial tal cual**. Los convierte a un **formato canónico propio**: libro → secciones → **bloques tipados** (`heading`, `byline`, `paragraph`, `titlePage`, `image`, `ornament`, `pageAnchor`), cada uno con `id` estable. Ver el tipo propuesto en el análisis.
- Flujo de ingesta:
  1. Validar (EPUBCheck).
  2. Normalizar con un script propio con pruebas y un mapeo de estilos por libro.
  3. Revisión visual humana en 390, 768 y 1440 px.
  4. Publicar.
- Se aceptan **dos entradas**: EPUB de InDesign y Word (Word vía Pandoc a HTML y luego el mismo normalizador).
- **Salidas** desde el canónico:
  - Capítulos para el lector (Edge Function `get-chapter` con marca de agua).
  - EPUB 3 limpio como archivo maestro.
- Metadatos (autores con rol, ISBN, idioma, accesibilidad) desde Supabase, no desde el EPUB. Colofón digital generado.
- Fuentes: solo libres (OFL) servidas por +reads; las comerciales se reemplazan.
- El lector conserva el paginador por columnas CSS (ADR 0005), ampliado para pintar bloques. **foliate-js ya no es necesario** para libros propios.

## Alternativas consideradas

- **Servir el EPUB tal cual con foliate-js o epub.js:**
  - A favor: rápido.
  - En contra: hereda todos los defectos (fuentes que no cargan, negro sobre Carbón, portada falsa, portadillas rotas). No hay ids estables para progreso y subrayados, y es difícil poner marca de agua por capítulo.
- **Corregir a mano cada EPUB (Sigil o Calibre) y servirlo:**
  - A favor: sin código.
  - En contra: no escala, depende de una persona y se repite con cada errata.
- **Pedir solo Word:**
  - A favor: más limpio.
  - En contra: se pierden portadillas y diseño, y la editorial ya trabaja en InDesign. Se acepta Word, pero no como única vía.

## Consecuencias

- Hay que cambiar `ReadableText` (`src/lib/reader/types.ts`) de `paragraphs: string[]` a bloques tipados, y el `Reader` para pintarlos.
- Las anclas por bloque permiten progreso y subrayados estables y arreglan la posición al cambiar el tamaño de letra.
- El mismo formato canónico es la base del "taller editorial" (ADR 0011).
- Hay que mantener el normalizador. Si la editorial sigue la [guía de exportación](../editorial/guia-exportar-epub-desde-indesign.md), el mapeo por libro se vuelve casi automático.
- **El contenido de los libros nunca se sube al repo** (es público): va a Storage privado. En local se usa `contenido-privado/` (en `.gitignore`).
