# 0016 — Formato canónico v1 e importador en Node con verificación de integridad

- **Fecha:** 2026-11-24
- **Estado:** Aceptada. Concreta y amplía el [ADR 0010](0010-ingesta-epub-a-formato-canonico.md) (que sigue vigente en su idea central).
- **Decide:** Erick, con recomendación técnica

## Contexto

El prototipo de ingesta (`prototipos/taller-impresion/normalizar.py`) tenía un error que **no se veía**: al encontrar una marca de salto de página del impreso (`doc-pagebreak`) a mitad de una frase, descartaba el texto que venía justo después. En _El príncipe feliz_ eso dejó **14 párrafos cortados a media frase** y se perdieron 423 palabras (2,836 de 3,259). Nadie lo notó porque no existía ninguna comprobación de que el texto saliera completo.

Además llegó _Nahual_, que es otro tipo de material: **tres de sus cuatro EPUB son el libro completo exportado tres veces** (prólogo, nota del autor, cuento, epílogo y análisis visual en un solo archivo), con 17 imágenes sueltas al final del XHTML, títulos de sección hechos con imágenes sin texto alternativo y tarjetas de capítulo con el nombre horneado en la imagen. Un mapeo "una clase = un rol" ya no alcanza.

## Decisión

**1. Formato canónico v1** (`src/lib/libro/types.ts`). Una `Pieza` es una lista de bloques tipados: `heading` (nivel 1–3), `paragraph` (sangría, alineación, capitular, marcas de página), `byline` (firma y su línea de crédito), `image` (rol, ancho relativo, medidas, recorte), `spacer` y `ornament`. Cada bloque tiene id posicional (`<slug>-<n>`) y los párrafos y firmas llevan una huella del texto para re-anclar subrayados si el texto se edita. El texto en línea admite cursiva, negrita y versalitas. Es JSON puro: lo usan igual el importador, el lector y el futuro editor.

**2. Importador en TypeScript sobre Node 24** (`scripts/ingesta/`, sin pasos manuales), en lugar de Python:

- Lector de ZIP propio (`zip.ts`) que rechaza rutas con `..`, nombres repetidos, cifrado, ZIP64, tamaños desmedidos y CRC incorrectos. Los EPUB son entrada no confiable.
- XHTML parseado como **XML estricto** con `saxes` (no como HTML: InDesign escribe `<div … />` autocerrados que un parser HTML trataría como abiertos).
- Los estilos se leen del **CSS** del EPUB (sangría, alineación, última línea a la derecha, cursiva, negrita, versalitas), no se deducen de los nombres de clase, que InDesign cambia en cada exportación.
- **Las marcas de página se anotan como posición dentro del párrafo y el texto que sigue nunca se descarta** (`atoms.ts`). Es la corrección del error original.

**3. Mapeo por obra** (`contenido-privado/<obra>/mapeo.json`, validado con rigor en `mapeo.ts`): una obra puede venir en varias fuentes (EPUB); cada una declara el rol de sus clases y textos exactos, el rol de cada imagen y sus **piezas** por anclas de texto (`desde` / `hasta`). El corte es exhaustivo: todo texto cae en una pieza, se declara `ignorar` o la importación falla diciendo cuál quedó afuera. Toda imagen debe tener un rol decidido por una persona.

**4. Verificación de integridad como condición para publicar** (`verificar.ts`): se cuentan las palabras del XHTML **por un camino que no comparte código con el parser** (quitar etiquetas con expresiones regulares) y se exige que coincidan exactamente, en orden, con lo extraído. Después se comprueba que las piezas cubren todo el flujo sin repetir ni omitir, que los bloques construidos conservan el texto, que ningún párrafo termina cortado y que toda imagen quedó colocada. Las demás exportaciones del mismo libro se **contrastan** palabra por palabra (diferencias = advertencia, no error). Si algo falla no se escribe nada.

**5. Rol de imagen `capitulo`**: una tarjeta de capítulo (adorno + nombre dentro de la imagen) se importa como adorno **recortado** (`crop` en el bloque, se muestra solo una banda de la imagen) más un **título real**. Así el nombre del capítulo es texto accesible, escala con la letra y aparece en el índice.

**6. Publicación para la app** (`npm run contenido:publicar`): importa todas las obras de `contenido-privado/`, y copia lo que necesita el lector a `public/contenido/<obra>/` (piezas en JSON compacto + imágenes con huella en el nombre) más un manifiesto compilado `src/lib/contenido/manifests.generated.ts`. La app lee el manifiesto sin red (también en el servidor, para dar 404 reales) y descarga el texto de cada pieza bajo demanda.

## Alternativas consideradas

- **Seguir con el script de Python:** descartado. Es un prototipo sin pruebas, ya demostró un error silencioso y no comparte tipos con la app.
- **Servir el EPUB con foliate-js/epub.js:** descartado en el ADR 0010; sigue descartado.
- **Mapear solo por nombre de clase:** no funciona (cambia en cada exportación y una misma clase sirve para título y firma). Por eso el mapeo admite también texto exacto y se apoya en el CSS.
- **Verificar contando palabras con el mismo parser:** un error del parser pasaría desapercibido. Por eso el conteo independiente.
- **Guardar el contenido solo en `contenido-privado/`:** la app no compilaría en CI ni en otra máquina. Por eso se versionan también `public/contenido/` y el manifiesto generado (y hay pruebas que verifican que coinciden).

## Consecuencias

- **Se corrigió el error y quedó blindado:** hay una prueba que exige 3,259 palabras en _El príncipe feliz_ y que el párrafo "Este corazón de plomo no quiere fundirse en el horno…" esté completo; y pruebas unitarias del caso exacto (marca de página a mitad de frase, incluso partiendo una palabra).
- **Cobertura:** 132 pruebas (formato, validación, ZIP seguro, extracción, roles, cortes, mapeo, verificador, importación sintética de punta a punta y contra los dos libros reales). Las pruebas del contenido publicado en `public/` corren también en CI, donde no existe `contenido-privado/`.
- **Pendiente de confirmar con la editorial:** en _Nahual_ se asumió que el **Epílogo** es el cierre narrativo firmado por Argenis González y que el **Análisis visual de la obra** es el texto de Eduardo Serrato (cada una de las 4 imágenes de título aparece junto a su texto). Es una línea de `mapeo.json` si resulta al revés. También: la última imagen del EPUB (`ChatGPT_Image_28_ene_2026…`, siluetas de pájaros y un árbol) se ignora; su nombre sugiere que es generada con IA y conviene confirmar procedencia y uso.
- **Límites conocidos:** no hay importador de Word (`.docx`), notas al pie ni tablas; el importador avisa (`etiqueta-no-soportada`) en vez de ignorarlas en silencio. Las posiciones de lectura se guardan como proporción, no ancladas al bloque visible (siguiente paso del Hito 2).
- **Repo público:** el texto completo de las dos obras queda en `public/contenido/` y en el bundle del demo. Es una decisión del dueño; se anota como riesgo en `ESTADO.md`.
- **Guía de uso:** [`docs/INGESTA.md`](../INGESTA.md).
