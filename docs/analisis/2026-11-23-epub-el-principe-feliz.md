# Análisis de los EPUB de _El príncipe feliz_ (2026-11-23)

> Primer contenido real que mandó la editorial. Este documento explica **cómo vienen**, **qué falla** y **cómo deben entrar a +reads** para verse bien en cualquier pantalla. La decisión propuesta está en el [ADR 0010](../decisiones/0010-ingesta-epub-a-formato-canonico.md). La guía para la editorial está en [`docs/editorial/guia-exportar-epub-desde-indesign.md`](../editorial/guia-exportar-epub-desde-indesign.md).

## Archivos recibidos

**No están en el repo:** el repo es público y el contenido tiene derechos (traducción, prólogo e ilustraciones). En local, guárdalos en `contenido-privado/`, que está en `.gitignore`.

| Archivo                                        | Tamaño | Contenido                                                               | Palabras |
| ---------------------------------------------- | -----: | ----------------------------------------------------------------------- | -------: |
| `EL_PRINCIPE_FELIZ_PROLOGO.epub`               | 518 KB | Portadilla con golondrinas + prólogo de Mercedes Varela (julio 2026)    |     ~360 |
| `EL_PRINCIPE_FELIZ_NOTA_DE_LA_TRADUCTORA.epub` | 510 KB | Portadilla con golondrinas + nota firmada "Por Yarely Campos"           |     ~830 |
| `EL_PRINCIPE_FELIZ_CONTENIDO.epub`             | 181 KB | El cuento completo, logo, "Próximos lanzamientos" y colofón de imprenta |   ~3,300 |

Los tres son **EPUB 3 reflujable** (no de diseño fijo), exportados con **Adobe InDesign 21.6** (`<meta name="generator">`).

## Cómo están hechos por dentro

- **Un solo XHTML por archivo** y los tres se llaman igual: `EL_PRINCIPE_FELIZ_NOTA_DE_LA_TRADUCTORA.xhtml` (se copió la plantilla). Al unirlos chocan los nombres.
- **Sin semántica:** no hay ni un `<h1>`/`<h2>`. Los títulos son `<p class="P-rrafo-b-sico ParaOverride-1"><span class="CharOverride-1">`. Todo el estilo viene de _overrides_ locales (`ParaOverride-N`, `CharOverride-N`), no de estilos de párrafo con nombre. Los nombres de clase cambian de un archivo a otro: `CharOverride-2` es el texto del cuento en uno y la firma con Microsoft Himalaya en otro.
- **Fuentes ofuscadas** (`META-INF/encryption.xml`, algoritmo IDPF). Un navegador **no puede cargarlas** sin desofuscarlas. Lo comprobé con Chromium: todas fallan con `OTS parsing error: invalid sfntVersion` y el texto cae a Times.
- **Fuentes incrustadas:**

  | Fuente                                   | Uso                                         | Licencia                                 |
  | ---------------------------------------- | ------------------------------------------- | ---------------------------------------- |
  | Libertinus Serif (Regular, Italic, Bold) | Texto                                       | OFL, libre ✅                            |
  | Tangerine (Regular, Bold)                | Títulos caligráficos                        | OFL, libre ✅                            |
  | Monotype Corsiva                         | "Próximos lanzamientos"                     | Comercial (Monotype/Microsoft) ⚠️        |
  | Times New Roman PS Italic                | Colofón                                     | Comercial ⚠️                             |
  | Microsoft Himalaya                       | "Por Mercedes Varela" / "Por Yarely Campos" | Comercial; es una fuente **tibetana** ⚠️ |

  Servir fuentes comerciales en web o en un EPUB vendido requiere licencia. Además, la CSS declara `"Minion Pro"` (Adobe) como fuente base y no la incluye.

- **CSS de imprenta:**
  - `color:#000000` fijo en el párrafo base → **texto negro sobre el tema Carbón** del lector (ilegible).
  - `orphans:1; widows:1`, `line-height:1.2` (apretado para pantalla).
  - Justificado sin guiones (`-epub-hyphens:none`) → en celular salen "ríos" de espacios grandes (se ve en la captura de 390 px).
  - Marcos con `border-style:solid`, contenedores con `width:0.00%` y uno rotado 140° (restos de marcos gráficos vacíos de la maqueta).
- **Portada = captura de la página 1.** `image/1.png` (825×1275) es la primera página impresa rasterizada, con la capitular y el folio "1". No es una portada.
- **La capitular ("E" grande) se pierde:** solo existe en la imagen. En el texto no hay `::first-letter` ni marca.
- **Portadillas con golondrinas:** en la maqueta el título va **encima** de la ilustración. En el EPUB se exportan como una imagen a pantalla completa y, **debajo**, el título suelto. En celular se ve primero una pantalla entera de pájaros y luego el título (ver capturas en la bitácora).
- **Paginación impresa:** `page-list` con 36 marcas (`B1`…`B36`, saltando la 32 y la 34) y `<div role="doc-pagebreak">` incrustados **a mitad de frase**. Esto sirve para citar la página del impreso, pero no debe partir el texto en pantalla.
- **Basura de maquetación:** párrafos vacíos (`<span> </span>`) usados como espacio, `<span>` partidos a mitad de oración, dobles espacios.
- **Imágenes sin texto alternativo** (`alt=""` en todas, incluido el logo) y PNG pesados (210–260 KB por portadilla).
- **Metadatos pobres:**
  - `dc:title` en mayúsculas y sin acento ("EL PRINCIPE FELIZ CONTENIDO").
  - Sin `dc:creator` (autor ni traductora), sin editorial, sin ISBN (identificador `urn:uuid`).
  - `xml:lang="es-ES"`.
  - Sin metadatos de accesibilidad (está el comentario `<!--accessibility options-->` vacío).
- **Contenido que en digital está mal o caduca:**
  - Colofón "Impreso en Editorial Huapango, Elías Piña #100, Fuentes Secc. Lomas, Reynosa". Es falso en digital y **no coincide** con la sede del catálogo (Calle Novena #225, Col. Longoria).
  - Lista fija de "Próximos lanzamientos" que quedará vieja en cuanto salga uno.

## Validación

- **EPUBCheck no se corrió** en esta sesión: el entorno no permitió ejecutar el validador descargado. Córrelo en local:
  `java -jar epubcheck.jar contenido-privado/EL_PRINCIPE_FELIZ_CONTENIDO.epub` (descarga en https://github.com/w3c/epubcheck/releases). Es de esperar que avise por el `guide` de EPUB 2, los `media-type` de las fuentes y quizá por los IDs.
- **Pandoc 3.1.3 sí los lee** (`pandoc archivo.epub -t markdown`) y saca el texto completo, pero conserva todas las clases de InDesign. Sirve como extractor, no como solución.

## Datos que no coinciden con el catálogo (por confirmar con la editorial)

| Dato        | En el EPUB                           | En `references/catalogo.md`      |
| ----------- | ------------------------------------ | -------------------------------- |
| Traductora  | "Por Yarely Campos"                  | "Isabel Campos"                  |
| Dirección   | Elías Piña #100, Fuentes Secc. Lomas | Calle Novena #225, Col. Longoria |
| Prologuista | Mercedes Varela                      | (no aparece)                     |
| Ilustración | Archivos "NEKO" (¿ilustrador/a?)     | (no aparece)                     |

**No se cambió el catálogo:** según la regla de no inventar datos, primero hay que preguntar. Además se necesita la **autorización de distribución digital** de la traductora, la prologuista y quien hizo las ilustraciones. Wilde es dominio público; la traducción y lo demás, no.

## Veredicto: ¿se pueden subir tal cual?

**No.** Si se suben tal cual, en +reads pasaría esto:

- Las fuentes no cargan.
- En el tema Carbón el texto es negro.
- La "portada" es una página del libro.
- Las portadillas se rompen.
- El libro llega partido en 3 archivos.
- El colofón es incorrecto.

Con un lector de EPUB genérico (Apple Books o foliate-js) se vería "aceptable", pero no "perfecto en todas las pantallas".

## Cómo deben entrar a +reads (propuesta, ADR 0010)

**Idea central:** el EPUB de InDesign es **materia prima**, no el producto. +reads lo convierte a **su propio formato canónico**, limpio y semántico, y desde ahí genera lo que haga falta.

```
EPUB(s) de InDesign ─┐
Word (.docx) ────────┼─► 1. Validar ─► 2. Normalizar ─► 3. Revisión humana ─► Formato canónico (JSON de bloques)
                     │                                                         ├─► Lector web (capítulos + marca de agua)
                     │                                                         └─► EPUB 3 limpio (archivo / tiendas)
```

1. **Validar.** EPUBCheck, presencia de fuentes con licencia, imágenes, tamaño.
2. **Normalizar** (script propio en `scripts/ingesta/`, con pruebas):
   - **Unir** las partes en el orden del libro (portada → portadilla → prólogo → nota de la traductora → cuento → colofón), con IDs únicos.
   - **Mapear estilos a semántica:**
     - Títulos → `heading`.
     - Firma ("Por …") → `byline`.
     - Párrafo → `paragraph` (con o sin sangría).
     - Diálogos con raya: se dejan como párrafo; la raya ya es la convención en español.
     - "FIN" → `ornament`.
     - Lista de lanzamientos → se **quita** y la pantalla final la genera +reads con enlaces reales del catálogo.
   - Como InDesign renombra las clases en cada exportación, el mapeo se guarda **por libro** (`mapeo.json`) y se revisa en un paso visual. Si la editorial usa estilos con nombre (ver guía), el mapeo se vuelve automático.
   - **Limpiar:**
     - Quitar marcos vacíos, párrafos vacíos, `span` partidos, dobles espacios, colores y tamaños fijos.
     - Convertir las marcas de página impresa en **anclas invisibles** (`printPage: "B12"`), no en saltos.
   - **Capitular:** marca `dropCap: true` en el primer párrafo del capítulo; la pinta el lector con CSS (`initial-letter` con respaldo `::first-letter`), así escala con la letra.
   - **Portadillas:** bloque `titlePage` = ilustración de fondo + título encima. El lector lo maqueta a página completa (`object-fit: cover` con el título centrado), igual en 390 px y en 1440 px.
   - **Imágenes:**
     - Pasarlas a WebP en 2 tamaños con `width`/`height`.
     - Las decorativas, marcadas como tales (`alt=""` + `role="presentation"`).
     - Las informativas, con `alt` real que escriba la editorial.
   - **Fuentes:**
     - Libertinus y Tangerine (OFL) se pueden servir desofuscadas desde nuestro dominio, con subset latino.
     - Las comerciales (Corsiva, Times y Himalaya) **se reemplazan**:
       - La firma, por Libertinus en versalitas o cursiva.
       - El colofón, por Libertinus cursiva.
     - El texto corrido usa la fuente que el lector elija (hoy Newsreader). La tipografía del libro se respeta en títulos y portadillas.
   - **Metadatos desde Supabase**, no desde el EPUB:
     - Título con ortografía RAE.
     - Autor (Oscar Wilde) y traductora con rol `trl`.
     - Prologuista con rol `aui` o `wpr`.
     - Editorial, ISBN digital e idioma `es-MX`.
     - Metadatos de accesibilidad (`schema:accessMode`, etc.).
   - **Colofón digital** generado: derechos, ISBN digital, año y "Edición digital". **Nunca** "Impreso en".
3. **Revisión humana.** Vista previa del libro normalizado en 390, 768 y 1440 px en el panel de la editorial antes de publicar.
4. **Salidas:**
   - **Lector web:** el formato canónico se parte **por capítulo** y lo entrega la Edge Function `get-chapter` (compra verificada, URL firmada y marca de agua con los datos del lector).
   - **EPUB 3 limpio y válido**, generado desde el canónico. Sirve de archivo maestro y para Kindle, Apple o Google si algún día se distribuye ahí.

### Qué cambia en el lector actual

Hoy `ReadableText` es `capítulos → paragraphs: string[]` (`src/lib/reader/types.ts`). Para el contenido real se vuelve una **lista de bloques tipados**:

```ts
type Block =
  | { type: "heading"; level: 1 | 2; text: Inline[] }
  | { type: "byline"; text: Inline[] }
  | { type: "paragraph"; text: Inline[]; indent: boolean; dropCap?: boolean }
  | { type: "titlePage"; title: string; byline?: string; background: ImageRef }
  | { type: "image"; image: ImageRef; alt: string; decorative: boolean; caption?: Inline[] }
  | { type: "ornament"; text: string } // "FIN", "* * *"
  | { type: "pageAnchor"; printPage: string }; // página del impreso, invisible
type Inline = string | { em: Inline[] } | { strong: Inline[] } | { smallCaps: Inline[] };
```

- Cada bloque lleva un `id` estable (`cap1-p17`) que sirve para **progreso, marcadores y subrayados** sin depender de la paginación. Esto también arregla el problema de posición proporcional de `remapSpread` al cambiar el tamaño de letra: se ancla al bloque visible.
- El paginador por columnas CSS (ADR 0005) **sirve** para estos bloques: solo pinta HTML semántico.
- foliate-js deja de ser necesario para nuestros propios libros, porque controlamos el formato. Queda como opción solo si algún día se aceptan EPUB de terceros sin normalizar.

### Reglas para que se vea bien en todas las pantallas

- Solo unidades relativas (`em`/`rem`); el tamaño lo controla el lector (A−/A+).
- Sin colores en el contenido: los pone el tema (Bond, Sepia o Carbón).
- Justificado **con guiones** (`hyphens: auto` y `lang="es"`). Por debajo de ~420 px de ancho de columna, alinear a la izquierda o dejar que el lector elija.
- `line-height` de 1.5 a 1.6 en pantalla, viudas y huérfanas en 2, `break-inside: avoid` en imágenes y portadillas.
- Imágenes con `max-height` del alto de página: nunca se parten entre columnas.
- Portadillas y portada a página completa en 1 página (celular) o como página derecha del pliego (escritorio).
- Probar siempre en 390, 768, 1024 y 1440 px, en los 3 temas y en los tamaños de letra mínimo y máximo.

## Capturas de referencia (no subidas al repo)

En esta sesión se renderizaron los XHTML en Chromium a 390 px y 1024 px. Confirmaron:

- Las fuentes no cargan (caen a Times).
- El título del cuento sale en Times de 4em partido en dos líneas.
- La portadilla del prólogo muestra una pantalla completa de golondrinas y el título "Prólogo" debajo, sin la caligrafía.
- El justificado deja ríos en celular.

No se subieron porque muestran texto con derechos y el repo es público.
