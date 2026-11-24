# 0017 — Portadas: rasterizar PDF y recortar con un navegador, sin binarios nativos

- **Fecha:** 2026-11-24
- **Estado:** Aceptada (solución de trabajo; se puede reemplazar por `sharp` cuando haya un entorno donde corra)
- **Decide:** recomendación técnica

## Contexto

La editorial entregó las portadas de dos formas: _Nahual_ como imágenes JPG con márgenes blancos y _El príncipe feliz_ como un **PDF de Canva de una sola página con la cubierta extendida** (contraportada, lomo y portada, 27.9 × 19.5 cm, sin sangrado ni cajas de corte). Había que sacar la portada a 500 × 720 px (proporción real del libro, 25:36) en JPG y WebP, más la versión de 260 px que usa el catálogo.

En el equipo de desarrollo (Windows 11) **los binarios nativos no arrancaron**: `poppler` (`pdfinfo`/`pdftoppm`) terminó con un código de error al ejecutarse con cualquier argumento y `@napi-rs/canvas` no cargó su `.node`. No se diagnosticó la causa; es compatible con una política del sistema que bloquea binarios sin firma. Por lo mismo `sharp` (también nativo) no es una apuesta segura aquí.

## Decisión

- **Rasterizar el PDF con `pdf.js` ejecutado dentro de Edge/Chrome** (`scripts/assets/pdf-a-png.ts`), que sirve la librería desde `node_modules` en un servidor local y vuelca la página a PNG. Los CMYK y las fuentes incrustadas salen bien (la extracción directa de la imagen CMYK del PDF salía con colores invertidos).
- **Recortar y exportar con el canvas del navegador** (`scripts/assets/portadas.ts`): detecta el margen blanco (`bbox`) o el lomo de una cubierta extendida (`panel-derecho`), ajusta a 25:36 con un sesgo vertical para no cortar el logo y exporta JPG y WebP reduciendo a mitades sucesivas para conservar nitidez.
- Ambos usan `playwright-core` (ya es dependencia de desarrollo por las pruebas de humo) con el navegador instalado: no se descarga nada. El procesamiento es determinista: volver a correrlo da los mismos bytes.

## Alternativas consideradas

- **`sharp`:** la herramienta correcta y estándar, pero es un binario nativo y aquí no se pudo contar con él.
- **Extraer la imagen embebida del PDF:** da la ilustración pero no la composición (título, ribetes, créditos), y los JPEG CMYK de Adobe salen invertidos.
- **Poppler/Ghostscript:** binarios nativos; Ghostscript además es AGPL (ver riesgos del taller).
- **Que la editorial exporte la portada suelta:** es lo ideal a futuro (se agrega a la guía `docs/editorial/`), pero hoy trabajan con una cubierta extendida de Canva.

## Consecuencias

- Reproducible: `npm run assets:pdf` y `npm run assets:portadas` (ver `docs/INGESTA.md`, sección "Portadas").
- La portada de _El príncipe feliz_ sale de un diseño con proporción 12.66 × 19.5 cm, no 12.5 × 18: se recorta ~3 % por arriba y ~5 % por abajo (con sesgo para conservar el logo). Si la editorial manda la portada final a 12.5 × 18 cm, se reemplaza sin tocar código.
- No es un proceso de producción para imprenta: eso es del taller editorial (ADR 0013).
