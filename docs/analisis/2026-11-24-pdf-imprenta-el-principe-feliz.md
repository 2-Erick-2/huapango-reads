# Análisis del PDF de imprenta de _El príncipe feliz_ (2026-11-24)

> **Archivo:** `EL_PRINCIPE_FELIZ_22OCTUBRE2026.pdf`, el que la editorial **usó para imprimir** (lo entregó Erick el 2026-11-24). No está en el repo (es público); en local va en `contenido-privado/imprenta/`.
> **Cómo se analizó:** `prototipos/taller-impresion/analizar_pdf_referencia.py` (pdfplumber, poppler y Ghostscript), más revisión visual de las 62 páginas.
> **Para qué sirve:** es la referencia de la **Fase 0** del taller (ADR 0013). De aquí salen las especificaciones de la plantilla "Cuentos a todas partes" y lo que su imprenta acepta.

## 1. Resumen ejecutivo

1. **No es PDF/X.**
   - Es un PDF 1.4 normal exportado de InDesign 21.6 (Windows), sin perfil de salida (`OutputIntents`) y **con imágenes en RGB y transparencias**.
   - Su imprenta acepta PDF "normal": el taller **no necesita PDF/X para que les impriman**. Aun así se recomienda salir en CMYK controlado (ver 6).
2. **No tiene sangrado:** `BleedBox = TrimBox = 396 × 612 pt`.
   - Tres páginas tienen ilustraciones que llegan al borde (5, 11 y 17). Sin sangrado, al refilar puede quedar un filo blanco.
3. **Formato confirmado:** 5.5 × 8.5 in (13.97 × 21.59 cm), **62 páginas**. **62 no es múltiplo de 4**: la imprenta agrega hojas en blanco o el armado es distinto (preguntar).
4. **Imprenta probablemente propia:** el colofón dice "Impreso en Editorial Huapango, Elías Piña #100, Fuentes Secc. Lomas, Reynosa". Eso explica por qué aceptan PDF sin PDF/X ni sangrado. **Confirmar** qué equipo usan (digital de tóner u offset): cambia los requisitos.
5. **El libro impreso incluye el prólogo y la nota de la traductora** dentro del mismo volumen. En digital se publican como minilibros (ADR 0012). El taller debe permitir ambas cosas con la misma fuente.
6. **14 fuentes distintas, 6 comerciales:** Minion Pro, Garamond, Courier New, Monotype Corsiva, Times New Roman y Microsoft Himalaya. Hay que sustituirlas por libres en las plantillas.
7. **La plantilla Typst ya se calibró** contra este PDF y reproduce sus páginas casi idénticas (comparación visual de las págs. 27 a 29).

## 2. Datos editoriales que resuelve (página legal, pág. 4)

| Dato                  | Valor en el impreso                               | Acción                                                                                                                                                 |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Traductora            | **Yarely Isabel Campos Servín**                   | Resuelve la duda "Yarely" contra "Isabel": es la misma persona. Catálogo actualizado (`data.ts` y `references/catalogo.md`)                            |
| Título original       | _The Happy Prince_                                | —                                                                                                                                                      |
| Prólogo               | Mercedes Varela                                   | —                                                                                                                                                      |
| Edición y corrección  | Luis Armando Rosado Lara                          | —                                                                                                                                                      |
| Editora               | Litzy Vanessa Banda Aranda                        | —                                                                                                                                                      |
| Ilustración y portada | Diego "Neko" Aguilar                              | Resuelve quién es "NEKO". Falta su **autorización digital**                                                                                            |
| Edición               | Primera edición, octubre 2026                     | ¿Ya está publicado? El catálogo aún dice "En prensa" (**por confirmar**)                                                                               |
| ISBN (impreso)        | **979-8-9961338-4-0** (dígito verificador válido) | El prefijo **979-8** se asigna en EE. UU. (Bowker), no en México (978-607). Es el ISBN **del impreso**: la edición digital necesita **su propio ISBN** |
| Colofón               | "Impreso en Editorial Huapango, Elías Piña #100…" | Es la dirección del taller de impresión; la sede del catálogo es otra. No se cambia nada                                                               |

**Erratas detectadas en el impreso (para avisar a la editorial):**

- La cornisa de las páginas impares dice "EL PRINCIPE FELIZ", **sin tilde** (debe ser "EL PRÍNCIPE FELIZ").
- En la página legal, el crédito "Diseño de portada" dice `Diego ¨Neko¨ Aguilar`, con diéresis (¨) en lugar de comillas. En la pág. 5 sí está bien ("Neko").

## 3. Estructura del libro (62 páginas)

| Págs. | Contenido                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2   | Blancas                                                                                                                               |
| 3     | Portadilla: "El Príncipe Feliz" en fuente caligráfica (Explora) + logo                                                                |
| 4     | Página legal (Garamond 8 pt)                                                                                                          |
| 5     | Frontispicio a color: ilustración del príncipe a sangre (inferior) + logo + crédito                                                   |
| 6     | Blanca                                                                                                                                |
| 7     | Portada interior: logo + "OSCAR WILDE"                                                                                                |
| 8     | Blanca                                                                                                                                |
| 9     | Crédito de traducción (en **Courier New Bold**: rompe con el resto del diseño)                                                        |
| 10    | Blanca                                                                                                                                |
| 11    | Portadilla del prólogo: golondrinas a sangre + "Prólogo" (Tangerine Bold 40) + filete + "Por Mercedes Varela" (Microsoft Himalaya 24) |
| 12–16 | Prólogo (Libertinus 14/18, **sin sangría**, una línea en blanco entre párrafos)                                                       |
| 17    | Portadilla de la nota (mismo diseño que la 11)                                                                                        |
| 18–26 | Nota de la traductora                                                                                                                 |
| 27–56 | El cuento: apertura en página impar con título Tangerine 48 y capitular                                                               |
| 57–60 | Blancas (la 59 lleva el logo)                                                                                                         |
| 61    | Próximos lanzamientos (Monotype Corsiva 20 + Libertinus 12)                                                                           |
| 62    | Colofón (Times New Roman cursiva 9)                                                                                                   |

## 4. Especificaciones medidas (base de la plantilla "Cuentos a todas partes")

| Elemento                   | Medida en el impreso                                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tamaño final               | 396 × 612 pt = 5.5 × 8.5 in                                                                                                                                |
| Texto corrido              | **Libertinus Serif 14 pt, interlineado 18 pt**, justificado, **sin división de palabras**                                                                  |
| Párrafos del cuento        | Sangría de primera línea de ~14 pt (1 em) **y** una línea en blanco (18 pt) entre párrafos                                                                 |
| Párrafos de prólogo y nota | Sin sangría, línea en blanco entre párrafos                                                                                                                |
| Márgenes                   | Interior ≈ 70 pt, exterior ≈ 76 pt (espejo). Caja de texto ≈ 249 pt de ancho                                                                               |
| Primera línea de texto     | ≈ 117 pt desde el borde superior (≈ 114 pt en páginas sin cornisa)                                                                                         |
| Cornisa                    | Páginas pares: "OSCAR WILDE"; impares: título. Libertinus en versalitas, 8 pt, **78 % K**, con una golondrina pequeña y una fila de puntos (Minion Pro 12) |
| Folio                      | Centrado abajo, **Explora 14 pt** (≈ 545 pt desde arriba)                                                                                                  |
| Título de capítulo         | Tangerine Regular 48 pt, centrado, página impar                                                                                                            |
| Capitular                  | Libertinus 69.6 pt, descolgada 3 líneas                                                                                                                    |
| Color de texto             | 100 % K (28,141 caracteres) y 78 % K en cornisas (403). **Nunca negro enriquecido en texto** ✅                                                            |

## 5. Imágenes y tinta

| Pág.           | Imagen                            | Resolución efectiva | Color                 | Observación                                                                                                                                                               |
| -------------- | --------------------------------- | ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5              | Príncipe y ciudad (frontispicio)  | **200 ppp** ⚠️      | RGB JPEG              | Por debajo de 300 ppp; llega al borde sin sangrado                                                                                                                        |
| 11 y 17        | Golondrinas (fondo de portadilla) | 300 ppp ✅          | RGB JPEG + máscara    | **Existe en 1659 × 2557 px**: el EPUB traía una copia reducida (825 px). Pedir este original                                                                              |
| 3, 5, 7, 9, 59 | Logo Huapango                     | 282–435 ppp         | Mapa de bits indexado | El logo va **rasterizado** y se imprime como negro de 4 tintas (C+M+Y+K, TAC 279 %). Debe ser **vectorial en 100 % K** para que el texto fino "editorial" no salga movido |
| 28–56          | Golondrina de la cornisa          | 300 ppp             | Indexado              | OK                                                                                                                                                                        |

- **Cobertura máxima de tinta (TAC):** 281 a 288 % en las páginas con imagen (simulado con Ghostscript y su perfil CMYK por omisión). Dentro de lo normal (< 300 %).
- La conversión real de RGB a CMYK la hace **la imprenta** con su perfil. Por eso los colores del frontispicio pueden variar de un tiraje a otro.

## 6. Qué significa para el taller

1. **Salida por defecto "compatible con su flujo actual":** PDF con texto en 100 % K, fuentes incrustadas, tamaño final 5.5 × 8.5 in. Funciona con su imprenta hoy.
2. **Mejoras que el taller hace automáticamente** (y su PDF de InDesign no hace):
   - **Sangrado de 3 mm** en páginas con imágenes al borde (5, 11 y 17).
   - **Logo vectorial en 100 % K**.
   - **Aviso de imágenes < 300 ppp** (la 5).
   - **Conversión de imágenes a CMYK** con el perfil que se elija, para que el color no dependa de la imprenta.
   - **Número de páginas múltiplo de 4** (o del pliego que se confirme), agregando blancas al final.
   - **Fuentes libres** en lugar de las comerciales.
   - **Cornisa con tildes** (se toma del título del catálogo).
3. **PDF/X como opción**, no obligación: queda listo (PDF/X-3 probado) para cuando usen una imprenta externa que lo pida.
4. **División de palabras:** el impreso no la usa y deja espacios grandes en líneas cortas (≈ 38 caracteres por línea a 14 pt). La plantilla la deja **apagada por omisión para igualar su diseño** (`--input guiones=si` la activa). **Recomendación:** activarla. Mostrarles la comparación.
5. **Un mismo documento, dos armados:**
   - **Impreso:** el libro completo con prólogo y nota dentro, como este PDF.
   - **Digital:** libro y minilibros por separado (ADR 0012).
   - El taller necesita el concepto de **"edición"** (impresa o digital), que define qué piezas entran y en qué orden.

## 7. Sustitución de fuentes comerciales (propuesta para las plantillas)

| Uso en el impreso                     | Fuente actual           | Propuesta libre                                                              |
| ------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| Página legal                          | Garamond                | EB Garamond (OFL)                                                            |
| Puntos de la cornisa                  | Minion Pro              | Libertinus Serif (ya usada) o un filete dibujado                             |
| Crédito de traducción (pág. 9)        | Courier New Bold        | Libertinus Serif (versalitas o cursiva). Decisión de diseño con la editorial |
| "Por Mercedes Varela" / "Por Yarely…" | Microsoft Himalaya      | Libertinus Serif                                                             |
| "Próximos lanzamientos"               | Monotype Corsiva        | Tangerine o Explora (ya usadas)                                              |
| Colofón                               | Times New Roman cursiva | Libertinus Serif cursiva                                                     |

Libres que ya usan y se conservan: Libertinus Serif (Regular, Italic, Bold y versalitas), Tangerine, Explora y Libre Baskerville.

## 8. Lo que todavía hay que confirmar

- ¿Imprimen ellos mismos (Elías Piña #100)? ¿Con qué equipo? ¿Cómo arman los pliegos con 62 páginas?
- Papel de interior y de forros, y su calibre (para el lomo).
- El PDF de la **portada** (forros) que mandaron a imprimir: este archivo es solo el interior.
- Original del frontispicio a 300 ppp y logo vectorial (SVG o AI).
- ¿_El príncipe feliz_ ya está publicado? Si sí, cambiar su estado en el catálogo.
- ISBN de la edición digital.
