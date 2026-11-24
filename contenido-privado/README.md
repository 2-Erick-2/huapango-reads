# Contenido de la editorial (con derechos)

> **Atención:** aquí hay material con derechos de autor de Editorial Huapango (traducción, prólogo, nota e ilustraciones). Se versiona en el repo **por decisión explícita del dueño (Erick, 2026-11-24)**, que hará el repositorio **privado**. Mientras el repo sea público, este contenido es visible para cualquiera.

## `el-principe-feliz/`

| Ruta                                                            | Qué es                                                                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `epub/EL_PRINCIPE_FELIZ_CONTENIDO.epub`                         | El libro (cuento). Exportado de InDesign 21.6                                                                                                                 |
| `epub/EL_PRINCIPE_FELIZ_PROLOGO.epub`                           | Minilibro: prólogo de Mercedes Varela (ADR 0012)                                                                                                              |
| `epub/EL_PRINCIPE_FELIZ_NOTA_DE_LA_TRADUCTORA.epub`             | Minilibro: nota de Yarely Isabel Campos Servín (ADR 0012)                                                                                                     |
| `imprenta/EL_PRINCIPE_FELIZ_22OCTUBRE2026.pdf`                  | **El PDF con el que imprimieron** (interior, 62 págs., media carta). Lo imprimen con "Folleto" de Adobe Acrobat                                               |
| `imprenta/EL_PRINCIPE_FELIZ_folleto-impuesto-por-el-taller.pdf` | Ese mismo PDF impuesto en folleto por `prototipos/taller-impresion/imponer_folleto.py` (16 hojas carta)                                                       |
| `imprenta/reporte-analisis.json`                                | Salida de `analizar_pdf_referencia.py` sobre el PDF de imprenta                                                                                               |
| `taller/libro.json`                                             | El cuento en formato canónico de bloques (salida de `normalizar.py`)                                                                                          |
| `taller/fonts/`                                                 | Fuentes **libres (OFL)** desofuscadas del EPUB: Libertinus Serif y Tangerine. Son _subsets_ (solo los glifos usados); para producción descargar las completas |
| `taller/golondrinas.png`                                        | Ilustración de Diego "Neko" Aguilar tomada del EPUB (825 px; **no sirve para imprenta**, el original es de 1659 × 2557)                                       |
| `taller/salidas/`                                               | PDFs del prototipo: interior calibrado, interior PDF/X-3 y portada PDF/X-3 (ISBN de ejemplo)                                                                  |
| `capturas/`                                                     | Comparación impreso vs. taller, hoja de contacto de las 62 páginas, EPUB renderizados a 390/1024 px, muestra del folleto                                      |

Análisis: `docs/analisis/2026-11-23-epub-el-principe-feliz.md` y `docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md`.

## `mapeo.json` y `canonico/` (todas las obras)

Cada obra importada con el importador (`docs/INGESTA.md`) trae:

| Ruta                          | Qué es                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `<obra>/mapeo.json`           | Decisiones editoriales (roles de clases e imágenes, piezas). Lo escribe y revisa una persona.            |
| `<obra>/canonico/`            | **Generado**: piezas en formato canónico, `manifest.json`, `assets/` e `informe.md` con la verificación. |

`npm run contenido:publicar` lo copia a `public/contenido/<obra>/` para la app.

## `nahual/`

| Ruta                                      | Qué es                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `epub/NAHUAL PROLOGO1.epub`               | **El libro completo** exportado de InDesign: prólogo, nota del autor, cuento, epílogo y análisis visual (95 págs. impresas, 17 imágenes).                    |
| `epub/NAHUAL EPILOGO.epub`, `…NOTA DEL AUTOR.epub` | La misma exportación con otro nombre de archivo (mismo texto, palabra por palabra). Se usan para contrastar.                                    |
| `epub/NAHUAL CUENTO.epub`                 | El cuento más el epílogo. También se contrasta.                                                                                                             |
| `mapeo.json`, `canonico/`                 | Ver arriba. Cinco piezas: el libro y cuatro complementos.                                                                                                   |

Las portadas (frente y contraportada) las entregó la editorial como JPG; la de frente está procesada en `public/books/portada-nahual*`. De _El príncipe feliz_, el PDF de forros está en `el-principe-feliz/imprenta/EL_PRINCIPE_FELIZ_forros.pdf` (cubierta extendida de Canva con la sinopsis oficial en la contraportada).