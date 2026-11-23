# 0013 — Taller editorial completo: editor propio + Typst + Ghostscript para PDF/X de imprenta

- **Fecha:** 2026-11-23
- **Estado:** Aceptada en lo general (Erick decidió construirlo). Los detalles se confirman en la Fase 0 con la imprenta. Reemplaza al ADR 0011.
- **Decide:** Erick

## Contexto

Erick quiere desarrollar para Editorial Huapango un editor completo, solo para sus libros, desde el que puedan crear y exportar sus libros con **PDF de imprenta correcto**, además de EPUB y +reads, para dejar de depender de Adobe. El ADR 0011 recomendaba no hacerlo, porque suponía construir el motor de composición y de PDF. El prototipo del 2026-11-23 mostró que ese motor ya existe (Typst) y que la conversión a PDF/X se resuelve con Ghostscript. Análisis completo: `docs/analisis/2026-11-23-taller-editorial-completo.md`.

## Decisión

- **Una sola fuente por obra:** el documento canónico de bloques (ADR 0010), editado en un **editor estructurado ProseMirror** dentro de +reads (`/taller`, solo para el rol editorial).
- **Diseño con plantillas Typst por colección** y parámetros editables, más **ajuste fino por párrafo** guardado como datos. No hay maqueta libre de marcos.
- **PDF de imprenta:** Typst (CMYK declarado, texto en 100 % K, TrimBox y BleedBox) → **Ghostscript** → **PDF/X** con el perfil ICC de la imprenta → **preflight propio** (fuentes, sin RGB, ≥ 300 ppp, cobertura de tinta, sangrado y múltiplos de pliego).
- **Portadas:** el taller arma la portada extendida (lomo automático, sangrado, marcas, EAN-13, textos y logo). La **ilustración** se hace fuera, en Affinity (gratis) o con quien ilustra, a 300 ppp.
- **Servicio de impresión** en un contenedor aparte (Typst + Ghostscript) con cola en Supabase. No corre en Vercel ni en Edge Functions.
- **Primero la Fase 0** (spike con su imprenta y prueba física). Si la imprenta no acepta el PDF, se revisa esta decisión antes de construir el editor.

## Alternativas consideradas

- **Clon de InDesign con maqueta libre:** descartado por costo y riesgo.
- **Paged.js o Vivliostyle (Chromium):** Chromium no produce CMYK ni PDF/X. Vivliostyle tiene un modo _press-ready_, pero es AGPL y la calidad de composición es menor.
- **Prince:** soporta PDF/X, pero cuesta $3,800 USD por servidor y exige licencia de sitio para documentos comerciales.
- **LaTeX:** excelente composición, pero difícil de integrar con un editor web y de plantillar para no programadores.
- **Seguir con InDesign y solo importar a +reads (ADR 0010):** sigue siendo la base mínima; el taller la extiende.

## Consecuencias

- El formato canónico (ADR 0010) pasa a ser la pieza central de todo: lector, EPUB, impreso y taller.
- Riesgo legal por **Ghostscript (AGPL)**: usarlo sin modificar como programa aparte; confirmarlo con un abogado o comprar la licencia comercial de Artifex.
- Compite en tiempo con los Hitos 2 y 3. Orden recomendado: Fase 0 ya, Fase 1 junto con el Hito 2 y luego decidir.
- Es otro producto: hay que cotizarlo aparte y definir la propiedad intelectual en el contrato.
- La capitular, la poesía y las notas al pie se validan con texto real en las primeras fases.
