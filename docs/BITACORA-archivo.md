# Bitácora — archivo histórico

> Entradas anteriores archivadas para mantener docs/BITACORA.md ligero al iniciar sesiones.

## 2026-11-24 — Ensayos gratuitos en el inicio, obras nuevas desde el panel y vista previa completa

**Pedido (Erick):** el botón de leer ya no estaba en la esquina de la portada; "Lecturas cortas" no estaba alineada ni tenía flechas y se debe quitar para poner un carrusel de **ensayos** (gratis, subidos desde el panel); que el panel pueda **crear un libro nuevo** y que la **vista previa sea completa** (lectura e impresión), no una orilla delgada.

**Hecho** ([ADR 0019](decisiones/0019-ensayos-gratuitos-obras-nuevas-y-vista-previa-completa.md)):

- **Ficha:** el botón de leer vuelve a la esquina inferior derecha de la portada (la portada se alinea arriba de su celda; antes se estiraba con la fila). Prueba de navegador que lo mide.
- **Inicio:** `Carousel` común (flechas, scroll) para todas las filas, así quedan alineadas. Se quitó "Lecturas cortas" y se agregó **"Ensayos"** (de los manifiestos con tipo `ensayo`); sin ensayos dice "Muy pronto". Prueba: encabezados alineados y flechas presentes.
- **Tipo `ensayo`** (`PiezaKind`), `summary` y `authors` opcionales en el manifiesto; `mainEntry` devuelve libro o ensayo.
- **Panel:** `/panel/nuevo` (libro o ensayo), "Tus obras nuevas" en la biblioteca (editar, agregar prólogo/epílogo a libros, descargar paquete, borrar), `src/lib/panel/obras.ts` y `src/lib/libro/paquete.ts` (paquete, validación, slug). `publicar.ts` acepta `contenido-privado/<obra>/paquete.json` (con BOM o sin él).
- **Vista previa completa:** `PreviewModal` a pantalla completa con **Lectura (+reads)** (el `Reader` real, modo `embedded`) e **Impresión (media carta)** (`PrintPreview`: hojas con folio, zoom, conteo de páginas y de las que faltan para múltiplo de 4). Se quitó la pestaña angosta.
- **Corrección:** al editar una pieza sin firma se perdía su autoría; `docToPieza` ahora la conserva.

**Verificado:** `tsc`, `eslint`, `prettier`; **184 pruebas**; `e2e:humo` **43/43**; `e2e:panel` **29/29** (vista previa a 1440×900, lector real, impresión, crear ensayo, descargar paquete, libro con prólogo). Prueba real de publicación con un ensayo de muestra: aparece en "Ensayos" y se lee; después se retiró y el contenido quedó idéntico (huella SHA-256 igual). Capturas revisadas.

**Pendiente:** imágenes y ficha de catálogo en obras nuevas; guardado y versiones en Supabase; "Importar y revisar". La impresión es aproximada (el PDF final es del taller). No verificado: Safari/Firefox, teléfono real, lectores de pantalla.

## 2026-11-24 — Ficha: portada con título y `+reads` en grande a su lado (sin hueco)

- **Erick:** quedaba un espacio en blanco grande junto a la portada; el dueño quería el título en grande y, debajo, el `+reads` también grande (no una franja bajo la portada).
- **Hecho** (`src/routes/libro/[slug].tsx`): la sección de portada es una cuadrícula (portada | información). A la derecha: ruta, título (hasta 96 px), firma, **`+reads` hasta 120 px** con "Edición digital", y, alineados al pie de la portada, géneros, tiempo, avance y botones. En celular las acciones pasan a ancho completo bajo la portada (un solo DOM, sin duplicados).
- **Verificado:** tsc, eslint, prettier; `e2e:humo` 38/38 y `e2e:panel` 19/19; capturas de escritorio y celular revisadas.

## 2026-11-24 — Diseños aprobados llevados al código (ficha, inicio, ajustes) y primer corte del panel con editor

**Pedido:**

- **Erick:** "el diseño no es el correcto, no es el que me enseñaste que tenía hasta el audiolibro y todo eso… puedes arreglar eso".
- **Erick:** "y de una vez empecemos con el panel de admin para empezar con el editor".

**Hecho:**

- **Ficha "libro abierto"** (`src/routes/libro/[slug].tsx`, reescrita) con el orden del boceto del dueño:
  - "En breve" (la sinopsis, con "Leer sinopsis completa" en celular).
  - Portada con título grande, firma de traducción, marca `+reads` y botón de leer sobre la portada.
  - Avance real ("34 % leído · te quedan unos N min") y "Continuar leyendo", salido de la posición guardada.
  - "Dentro de este libro": cada pieza como minilibro de papel con su listón (`PiezaCard.tsx`).
  - **Audiolibro "Próximamente"** y **Club de lectura**: calificación con medias estrellas, reseñas, y una caja "Tu reseña se abre al terminar el libro".
  - Ficha técnica y precio al final. Las reseñas son **de ejemplo** y la pantalla lo dice ("Vista de ejemplo"); hoy `src/lib/club/` las sirve detrás de una interfaz async para cambiarlas por Supabase.
- **Inicio** (`ReadShelf.tsx`, `src/lib/contenido/shelves.ts`): filas **"Continúa leyendo"** (con avance guardado) y **"Lecturas cortas"** (piezas de 30 min o menos, tiempo calculado del texto).
- **Lector:** panel de **ajustes "Aa"** como en el diseño (`SettingsPanel.tsx`): tamaño, tema, **tipografía** (Newsreader o Sans) e **interlineado** (compacto, normal, amplio). `parseSettings` normaliza lo guardado y lee las preferencias antiguas.
- **Panel de la editorial, primer corte** ([ADR 0018](decisiones/0018-editor-prosemirror-sobre-el-formato-canonico-y-panel-solo-local.md)):
  - `src/lib/editor/` (esquema de ProseMirror = formato canónico; conversión de ida y vuelta).
  - `src/components/panel/` (marco, editor con barra de herramientas, revisión en vivo, vista previa, borrador local, descarga).
  - Rutas `/panel` (biblioteca) y `/panel/<obra>/<pieza>` (editor).
  - Solo en desarrollo o con `VITE_PANEL=true`; en el build público responde 404.
- **Pruebas nuevas:** `scripts/e2e/panel.ts` (`npm run e2e:panel`) y ampliación de `humo.ts`; unitarias de editor, club, estantes y preferencias. `scripts/e2e/comun.ts` comparte la búsqueda del navegador.
- **Documentación:** ADR 0018, `ESTADO.md`, `ROADMAP.md`, `ARQUITECTURA.md`, `AGENTS.md`.
- Dependencias nuevas (versión exacta): `prosemirror-model` 1.25.13, `prosemirror-state` 1.4.4, `prosemirror-view` 1.43.1, `prosemirror-commands` 1.7.2, `prosemirror-keymap` 1.2.3, `prosemirror-history` 1.5.2.

**Verificado:**

- `tsc` ✅, `eslint` ✅, `prettier --check --end-of-line auto` ✅, `vitest` ✅ **176 pruebas** (el editor hace el viaje de ida y vuelta exacto sobre las 8 piezas reales), `build` ✅.
- **Navegador real (Edge, 1440 y 390): `e2e:humo` 38/38 ✅ y `e2e:panel` 19/19 ✅.** Cubre: ficha con resumen, piezas, audiolibro y Club; "Lecturas cortas" y "Continúa leyendo"; ajustes de interlineado y tipografía aplicados al texto; editor (escribir, aviso por párrafo sin punto y su corrección, negrita, cursiva, deshacer, vista previa, borrador recuperado tras recargar, descarga, descartar); Nahual con sus 10 imágenes.
- **Seguridad del panel:** un build sin `VITE_PANEL` responde 404 en `/panel` y `/panel/…` y 200 en el sitio.
- Capturas de la ficha en escritorio y celular y del editor revisadas a ojo. Se acotó la altura de la portadilla de golondrinas en la hoja de edición.
- Mis primeras versiones de las pruebas fallaron por errores míos (selector que apuntaba al `<html>`; escribir sin pausas, que ProseMirror agrupa en un solo "deshacer"); se corrigieron y no eran defectos de la app.
- **No verificado:** Lighthouse de las pantallas nuevas, lectores de pantalla, Safari y Firefox, un teléfono real, el workflow de GitHub Pages, ni la portadilla a página completa con título en Tangerine del diseño (requiere autoalojar esa fuente; pendiente).

**Pendiente / siguiente:**

- **Del diseño aún sin código:** portadilla a página completa con el título en Tangerine sobre la acuarela; el Club de lectura con reseñas reales y escribir una reseña (Hito 2).
- **Panel:** pantalla "Importar y revisar" con mapeo asistido; edición de metadatos, imágenes (alt, recorte) y firmas; guardado y versiones en Supabase; cuentas y roles (el panel no debe publicarse sin ellos).
- Fusionar la rama a `main` para que el demo público muestre todo (ver `ESTADO.md`).

## 2026-11-24 — Importador en Node verificado, los dos libros reales completos, lector con bloques y portadas

**Pedido:**

- **Erick:** "haz la solución de portar el normalizador a node, corrígelo al 100 como senior top sin errores y de la mejor manera".
- **Erick:** "como otro libro adicional te dejo el de nahual, en la carpeta epubs te deje todos los epubs… y aquí te dejo las 2 imágenes que me dieron que son las portadas, estos usaremos para la demo".
- **Erick:** "te deje en la carpeta de epubs el pdf… contiene las portadas como las mandan a imprimir, si te sirven úsalas, entrégame una versión estable que pueda probar yo… dejando todo documentado para mejorar esto".
- **Erick:** "dime si ya podemos empezar con el diseño del panel de admin… dame plan completo".

**Hecho:**

- **Hallazgo:** `prototipos/taller-impresion/normalizar.py` descartaba el texto que sigue a una marca de salto de página a mitad de frase. _El príncipe feliz_ tenía **14 párrafos cortados** y 423 palabras perdidas (2,836 de 3,259). Detalle en el [ADR 0016](decisiones/0016-formato-canonico-v1-e-importador-en-node.md).
- **Formato canónico v1** en `src/lib/libro/` (`types.ts`, `text.ts`, `validate.ts`) con pruebas.
- **Importador en TypeScript/Node** en `scripts/ingesta/`:
  - `zip.ts` (ZIP seguro), `xml.ts` (XML estricto con `saxes`), `css.ts`, `epub.ts`, `atoms.ts` (extracción sin perder texto), `normalizar.ts` (roles), `piezas.ts` (corte exhaustivo por anclas y construcción), `mapeo.ts` (esquema validado), `verificar.ts` (conteo independiente), `obra.ts` (orquestador, informe), `importar.ts` e `inspeccionar.ts` (comandos).
  - Rol de imagen `capitulo` con `crop` (adorno recortado + título real).
- **Mapeos y salida auditable** en `contenido-privado/nahual/` y `contenido-privado/el-principe-feliz/` (`mapeo.json`, `canonico/`, `informe.md`). Los EPUB de _Nahual_ se copiaron a `contenido-privado/nahual/epub/`; `epubs/` quedó en `.gitignore`.
- **`npm run contenido:publicar`** (`scripts/contenido/publicar.ts`): publica a `public/contenido/<obra>/` y genera `src/lib/contenido/manifests.generated.ts`.
- **Catálogo** (`src/lib/catalog/`): `Book.read` (reemplaza `hasSample`), `contributors`, y `quote`, `publishedAt` y `print` pueden ser `null` ("por confirmar"). _El príncipe feliz_ pasa de "Próximamente" a libro real (sinopsis oficial de la contraportada, créditos). _Nahual_ gana su prólogo y el crédito de la portada.
- **Lector** (`src/components/reader/`): `Reader.tsx` reescrito sobre bloques; `Blocks.tsx` (texto con énfasis, capitular, firmas, imágenes con recorte, adaptación a temas); `ObraReader.tsx`; rutas `/leer/[obra]` y `/leer/[obra]/[slug]`; `/leer/demo` ahora usa el mismo motor (`demo-pieza.ts`). Tiempo restante en vez de número de página, posición guardada por pieza (`position.ts`), índice de piezas y capítulos, `.drop-cap` en `app.css`.
- **Ficha** (`src/routes/libro/[slug].tsx`): créditos, "Dentro de este libro", "Leer ahora", datos nulos sin romper. **Inicio**: "Leer muestra" lleva a la lectura real.
- **Prerender** de todas las rutas de lectura para GitHub Pages (`vite.config.ts`).
- **Portadas** reales en `public/books/` (JPG, WebP 500 y 260) de _Nahual_ (versión de imprenta) y _El príncipe feliz_ (recortada del PDF de forros). Scripts reproducibles `scripts/assets/pdf-a-png.ts` y `scripts/assets/portadas.ts` ([ADR 0017](decisiones/0017-portadas-con-pdfjs-y-canvas-sin-binarios-nativos.md)).
- **Prueba de humo en navegador real** versionada: `scripts/e2e/humo.ts` (`npm run e2e:humo`, con `playwright-core`).
- **Diseños** en Claude Design (6 pantallas: libro abierto móvil y escritorio, lector en 3 pantallas, inicio): https://claude.ai/artifact/A49y1xUCML5JfEVLCcUnve. Aprobados por Erick; sin implementar.
- **Documentación:** `docs/INGESTA.md` (nueva), ADR 0016 y 0017, `docs/analisis/2026-11-24-panel-editorial.md` (plan del panel), `ESTADO.md`, `ROADMAP.md`, `ARQUITECTURA.md` y `AGENTS.md` actualizados.
- Dependencias nuevas (versión exacta, solo de desarrollo): `saxes` 6.0.0 y `playwright-core` 1.65.1. Node 24.22.3 instalado en `~/tools/node24` (el binario oficial; `winget` solo ofrece Node 26).

**Verificado:**

- `npx tsc --noEmit` ✅, `npx eslint .` ✅, `prettier --check --end-of-line auto .` ✅ (sin esa opción marca todo: el árbol de trabajo es CRLF por `core.autocrlf=true`), `npx vitest run` ✅ **132 pruebas** (12 archivos), `npm run build` ✅.
- **Integridad del importador sobre los libros reales:** _Nahual_ 11,710 palabras del XHTML = 11,710 extraídas, en orden; las exportaciones EPILOGO y NOTA DEL AUTOR y el EPUB CUENTO (10,588 palabras) coinciden palabra por palabra. _El príncipe feliz_: 3,306 palabras del XHTML = 3,259 en piezas + 47 ignoradas (próximos lanzamientos y colofón); prólogo y nota completos.
- **Navegador real (Edge 1440 y 390): `npm run e2e:humo` 30/30 ✅.** Capturas revisadas a ojo (lector, índice, tema Carbón, ficha, portadas).
- Defecto real encontrado y corregido con esa prueba: **al recargar en escritorio no se restauraba la posición** (una primera medición parcial guardaba 0 y pisaba la guardada). Ahora la posición guardada se aplica en cada medición hasta que la persona pasa de página.
- Segundo hallazgo visual corregido: las "viñetas" grandes de _Nahual_ eran **tarjetas de capítulo con el nombre dentro de la imagen** (Jornalero, Media Vida, Alambrado, Rezandera, Zopilotes); ahora son título real + adorno recortado.
- **No verificado:** Lighthouse de las pantallas nuevas, lectores de pantalla, Safari y Firefox, un teléfono real, el workflow de GitHub Pages con las rutas nuevas (no se fusionó a `main`), `npm run check` completo en una máquina Linux.

**Pendiente / siguiente:**

- Decidir cuándo fusionar a `main` (y aceptar el texto completo público) para que el demo de Pages muestre lo nuevo. Hacer el repo privado cuando el dueño lo decida.
- Confirmar con la editorial las asunciones de _Nahual_ (qué texto es el epílogo y cuál el análisis visual; la imagen `ChatGPT_Image…`) y los datos "por confirmar" de `ESTADO.md`.
- Llevar a código los diseños aprobados (libro abierto, Club de lectura, audiolibro "Próximamente", "Continúa leyendo", ajustes del lector). Ver `ROADMAP.md`.
- Conversión de imágenes a WebP con `srcset`, importador de Word, notas al pie, EPUBCheck, `e2e:humo` en CI.
- Diseñar el panel de la editorial, empezando por "Importar y revisar" ([plan](analisis/2026-11-24-panel-editorial.md)).
- Que el taller de impresión lea el formato canónico v1 en lugar de su `libro.json`.

## 2026-11-24 — Imprimen en folleto de Acrobat, imposición propia y contenido subido al repo

**Pedido:**

- **La editorial explicó:** "Este lo mando a imprimir en folleto de Adobe… Adobe organiza las páginas para que abarquen media hoja cada una".
- **Erick:** "los archivos sí súbelos tú, no quiero batallar, que todo esté ahí, no importa que sea público, yo lo haré privado después… quiero ya poder pasar a mi máquina local… y seguir desarrollando la UI".

**Hecho:**

- **Sección 0 "Cómo imprimen"** en `docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md`:
  - Impresora propia con "Folleto" de Acrobat en hojas carta.
  - El sangrado no aplica; las 62 páginas se completan a 64.
  - PDF/X no aplica.
  - Riesgo de creep con 16 hojas.
  - Las imágenes a sangre salen con margen blanco.
- **ADR 0015 (Aceptada):** el taller exporta además el folleto impuesto.
- **Nuevo `prototipos/taller-impresion/imponer_folleto.py`** (pypdf): imposición como Acrobat, con relleno a múltiplo de 4 y compensación de creep opcional.
- **Plantillas parametrizadas** para correr desde la raíz del repo: `libro` en `coleccion-cuentos.typ`; `libro` e `ilustracion` en `portada.typ`. Guía rápida reescrita en el README del prototipo.
- **Contenido subido al repo por decisión del dueño** en `contenido-privado/el-principe-feliz/`:
  - EPUB y PDF de imprenta.
  - Folleto impuesto.
  - `libro.json`, fuentes OFL, ilustración y salidas del prototipo.
  - Capturas y reporte JSON.
  - Con su `README.md`.
- **Ignorados nuevos:**
  - `.gitignore` ya no ignora `contenido-privado/`; ignora `prototipos/**/.venv/` y `__pycache__/`.
  - ESLint (`eslint.config.js`) y Prettier (`.prettierignore`) ignoran `contenido-privado` y `prototipos/**/.venv`.
  - El número de teléfono del mensaje de la editorial **no** se guardó.
- **`ESTADO.md` "Para retomar en local" reescrito:** rama, contenido, aviso para hacer el repo privado (y que Pages deja de servir el demo en cuenta gratuita), cómo correr la UI y siguientes tareas de UI.
- Actualizados `AGENTS.md` y el análisis de los EPUB.
- **Corrección de un error propio:** el commit `0a4cea9` dejó **`docs/ROADMAP.md` vacío** (un script abrió el archivo para escribir antes de leerlo). Se restauró desde `b9703dc` y se volvieron a aplicar los cambios del 2026-11-24. Se revisó que no haya otros archivos vacíos.

**Verificado:**

- `imponer_folleto.py` sobre el PDF real: 32 caras = 16 hojas carta (792 × 612 pt). Revisión visual:
  - Hoja 1: 64|1 y 2|63 (blancas).
  - Hoja 16: 34|31 al frente y 32|33 atrás (centro del cuadernillo).
- La guía rápida corre desde la raíz con un venv nuevo (`typst==0.15.2`, pdfplumber, pillow y pypdf): el interior da 23 págs. y la portada de 62 págs. compila.
- `npm run check` y `prettier --check`: ver el resultado en el commit de esta entrada.

**Pendiente / siguiente:**

- **Hacer el repo privado.**
- Pedir a la editorial: modelo de impresora, papel y calibre, forros aparte y engrapado o pegado.
- **En local:** UI (minilibros en la ficha, créditos reales y lector con bloques) y Fase 1 del taller.

## 2026-11-24 — Análisis del PDF real de imprenta de _El príncipe feliz_ y calibración de la plantilla

**Pedido:** "aquí está el PDF que ellos me dieron, que es el que usaron para imprimir. Haz todo el análisis completo, sube todo a GitHub y deja todo listo para irme a seguir desarrollando en local con Claude Code".

**Hecho:**

- **Análisis completo:** `docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md`.
  - **No es PDF/X:** PDF 1.4 de InDesign 21.6 con RGB y transparencias, sin `OutputIntents` y **sin sangrado**.
  - 62 páginas de 5.5 × 8.5 in (no es múltiplo de 4).
  - Imprimen en su propio taller (colofón).
  - Incluye el prólogo y la nota dentro del libro.
  - Especificaciones medidas: Libertinus 14/18, márgenes de 70/76 pt, sangría más línea en blanco, cornisas en versalitas de 8 pt al 78 % K, folio en Explora 14, título en Tangerine 48 y capitular de 69.6 pt.
  - 14 fuentes, 6 comerciales, con propuesta de sustitución.
  - Imágenes: frontispicio a 200 ppp; logo rasterizado en 4 tintas.
  - TAC máximo ≈ 288 %.
  - Erratas: cornisa sin tilde y `¨Neko¨`.
- **Datos resueltos por la página legal:**
  - Traductora **Yarely Isabel Campos Servín**: actualizados `src/lib/catalog/data.ts` y `.claude/skills/huapango-reads/references/catalogo.md`.
  - Ilustrador Diego "Neko" Aguilar.
  - ISBN del impreso 979-8-9961338-4-0 (prefijo de EE. UU.; el digital necesita otro).
- **ADR 0014 (Aceptada):** salida "compatible con su flujo" por omisión y PDF/X como opción.
- **Nuevo** `prototipos/taller-impresion/analizar_pdf_referencia.py`: reporte JSON de cualquier PDF de imprenta. No copia el texto del libro.
- **`coleccion-cuentos.typ` calibrada** contra el impreso, con parámetros `autor`, `titulo` y `guiones`. La división de palabras queda apagada como en su impreso.
- **Documentos actualizados:**
  - `ESTADO.md`: nueva sección "Para retomar en local", taller y por confirmar.
  - `ROADMAP.md` y `AGENTS.md`.
  - Tabla de respuestas en `docs/editorial/solicitud-datos-imprenta.md`.
  - Notas de "resuelto" en la guía y en el análisis de los EPUB.

**Verificado:**

- `analizar_pdf_referencia.py` corrió sobre el PDF real. Los resultados están en el análisis.
- Contacto visual de las 62 páginas y revisión a 50 ppp de las págs. 3–5, 7–9, 11, 13, 27–29, 59, 61 y 62.
- **Comparación** del impreso (págs. 27–29) contra la plantilla Typst: misma caja, cuerpo, interlineado, sangría, espaciado y cornisas.
- **Pendientes de la comparación:**
  - Capitular descolgada.
  - Ornamento de la cornisa.
  - Folio en Explora.
  - Foliado continuo (requiere las preliminares).
- Sin guiones salen espacios grandes, igual que en el impreso. Se recomienda activarlos.
- `npm run check` ✅ (cambió el texto de crédito en `data.ts`).
- El PDF, las capturas y los reportes **no** se subieron (contenido con derechos).

**Pendiente / siguiente:**

- **Pedir a la editorial:**
  - PDF de forros.
  - Papel y calibre.
  - Equipo y armado de pliegos.
  - ISBN digital.
  - Original del frontispicio y logo vectorial.
  - Permisos digitales.
- Avisar de las erratas.
- **En local, Fase 1:** formato canónico en TypeScript + importador EPUB.

## 2026-11-23 — Solicitud de datos a la imprenta

**Pedido:** "¿a qué te refieres con su versión de PDF/X? Les pido eso de una vez para que tú lo analices".

**Hecho:** `docs/editorial/solicitud-datos-imprenta.md` con:

- Explicación corta de PDF/X-1a, X-3 y X-4.
- Mensaje listo para mandar a la imprenta (11 preguntas).
- Lista de lo que hay que pedir a la editorial.
- Tabla para anotar las respuestas.
- **Recomendación clave:** pedir un **PDF ya impreso con éxito** en esa imprenta y el preset `.joboptions` de InDesign. De ahí se obtiene casi toda la configuración sin depender de que la imprenta conteste todo.

- (Ampliado el mismo día) Mensaje para la editorial: pedir el PDF **exacto** enviado a la imprenta (sin volver a exportarlo), el `.joboptions`, el paquete de InDesign (_Archivo → Empaquetar_) y las ilustraciones originales.

**Verificado:** solo documentación; `prettier` OK.

**Pendiente / siguiente:**

- Erick manda el mensaje.
- Cuando lleguen los archivos, guardarlos en `contenido-privado/imprenta/` y pedirle a Claude que analice el PDF de referencia (versión de PDF/X, `OutputIntent`/ICC, cajas, fuentes, tinta) y ajuste el prototipo.

## 2026-11-23 — Minilibros y decisión de construir el taller editorial con PDF de imprenta (prototipo Typst → PDF/X)

**Pedido:**

- **Corrección de Erick:** "solo el EPUB que dice CONTENIDO es el libro". El prólogo y la nota son contenido externo; el prólogo "se presentará como otro minilibro", igual que la nota.
- **Decisión:** "quiero realmente desarrollarles un editor completo solo para sus libros, y que de ahí puedan exportar"; "quiero poder exportar PDF de imprenta correcto"; "analiza bien a fondo, quiero usarte a ti para lograr eso".
- **Pregunta:** ¿las portadas se pueden hacer en la plataforma o hay que usar Affinity?
- También avisó que ya conectó GitHub.

**Hecho:**

- **Push** de la rama `claude/loving-hamilton-5m2lei` (antes fallaba con 403).
- **ADR 0012 (Aceptada):** prólogo y nota como **minilibros** (`kind: "complemento"`, `parentSlug`). Falta saber si son gratis, se venden o vienen incluidos.
- **Correcciones:**
  - El análisis de los EPUB ya no propone unir las partes.
  - La guía de exportación pide un EPUB por obra.
- **ADR 0010:** pasa a **Aceptada**.
- **Investigación (web, 2026-11-23):**
  - Typst 0.15 no exporta PDF/X.
  - Vivliostyle CLI tiene modo _press-ready_ (PDF/X-1a) y es AGPL.
  - Chromium no produce CMYK ni PDF/X.
  - Prince cuesta $3,800 USD por servidor y exige licencia de sitio para uso comercial.
  - Affinity es gratis desde octubre de 2025 y, según reseñas, exporta PDF/X-4; no se confirmó en una página oficial.
- **Prototipo** en `prototipos/taller-impresion/` (solo código; el contenido queda fuera):
  - `normalizar.py`: XHTML de InDesign → `libro.json` con mapeo por libro.
  - `desofuscar_fuentes.py`: fuentes OFL del EPUB.
  - `coleccion-cuentos.typ`: interior de 5.5 × 8.5 in.
  - `portada.typ`: portada extendida con lomo automático, sangrado, marcas de corte y EAN-13 propio.
  - `README.md` con todos los comandos para reproducirlo.
- **Análisis a fondo:** `docs/analisis/2026-11-23-taller-editorial-completo.md`. Incluye arquitectura, editor, plantillas, ajuste fino, PDF/X con preflight, portadas, infraestructura, motores comparados, 8 fases (16 a 26 semanas), riesgos, cómo trabajar con Claude, datos a pedir y negocio.
- **ADR 0013 (Aceptada en lo general):** taller con ProseMirror, plantillas Typst por colección, Ghostscript para PDF/X y servicio de impresión aparte. **Reemplaza al ADR 0011.** El análisis anterior del editor quedó marcado como superado.
- **Actualizados:** `ESTADO.md`, `ROADMAP.md` (sección del taller por fases) y `AGENTS.md` (`prototipos/`).

**Verificado (en el contenedor de la sesión, con Typst 0.15.2 vía PyPI y Ghostscript 10.02.1):**

- **Interior:**
  - 14 páginas de 396 × 612 pt.
  - Libertinus Regular e Italic y Tangerine incrustadas.
  - Separación silábica en español correcta y sin ríos (revisado visualmente en las páginas 1 y 2).
- **PDF/X:**
  - `GTS_PDFXVersion (PDF/X-3:2002)`, `OutputIntents` y `TrimBox` presentes, sin `DeviceRGB`.
  - Con `inkcov`: páginas 1 a 3 con C = M = Y = 0 y K de 3.7 % a 5.9 %.
- **Portada:**
  - 850 × 665 pt, lomo de 1.8 mm (36 págs. × calibre de prueba de 0.1 mm por hoja).
  - Convertida a PDF/X-3 sin RGB.
  - EAN-13 leído con `zbarimg` (`9783161484100`, **ISBN de ejemplo**).
- **Velocidad:**
  - Cuento: 0.04 s.
  - Libro de 131 págs.: 0.40 s.
  - Conversión a PDF/X con Ghostscript: 2.1 s.
- **Problema real detectado:** la ilustración de golondrinas queda a 147 ppp en la portada impresa (se necesitan ~300).
- **No verificado:**
  - Capitular descolgada: no se pudo usar el paquete `droplet` (`packages.typst.org` bloqueado y no se permitió ejecutar el paquete descargado).
  - PDF/X-1a y X-4.
  - Preflight comercial.
  - Perfil ICC real.
  - Prueba física con la imprenta.
- **Gotcha de Ghostscript:** `-dPDFX=3` truena (en 10.02 la opción es booleana: `-dPDFX`). Además, `PDFX_def.ps` debe pasarse con **ruta absoluta**; si no, Ghostscript usa el suyo del sistema y falla con `undefinedfilename`.

**Pendiente / siguiente:**

- **Fase 0:** pedir a la imprenta los datos de PDF/X, ICC, sangrado, tinta, calibre y pliego; resolver la capitular; mandar _El príncipe feliz_ a prueba física.
- Pedir a la editorial las ilustraciones a 300 ppp y los `.indd` o PDF de referencia.
- Confirmar el modelo comercial de los minilibros.
- Revisión legal de Ghostscript (AGPL).
- Cotizar el taller aparte.

## 2026-11-23 — Revisión senior del proyecto, análisis de los EPUB de _El príncipe feliz_ y opinión sobre el "editor tipo InDesign"

**Pedido:**

1. "Analiza este proyecto y dime qué piensas como senior top".
2. Con los 3 EPUB que mandó la editorial (prólogo, nota de la traductora y contenido de _El príncipe feliz_): "dime cómo entrarían en la plataforma para que funcione perfecto en todo tipo de pantallas".
3. Opinión sobre la promesa a los dueños de desarrollarles "un editor como InDesign" en su plataforma para no pagar Adobe.
4. "Todo lo que analices o hagas, documéntalo" para retomarlo en local con Claude Code.

**Hecho (solo documentación, sin cambios de código):**

- **Revisión del proyecto (conclusiones de esta sesión):**
  - **Fortalezas:**
    - Documentación con ADR, reglas de honestidad (no inventar datos, no prometer anticapturas) y la interfaz async del catálogo.
    - Pagos solo por webhook, versiones fijas y CI.
    - Lighthouse de 96 a 100.
  - **Riesgos detectados:**
    - Los bloqueos reales son de negocio (precios, contenido, regalías, revisión del cliente), no de código.
    - Falta la parte fiscal (CFDI e IVA de libros electrónicos; validar con el contador).
    - OXXO es un pago **asíncrono**: el webhook debe manejar `checkout.session.async_payment_succeeded` y `..._failed`, y la UI necesita un estado "pago pendiente".
    - Stack muy nuevo (Nitro 3 beta, SolidStart 2, TS 6, Vite 8) para una sola persona.
    - `remapSpread` conserva la posición de forma proporcional, no anclada.
    - Las pruebas de Playwright (32/32) no están en el repo ni en CI.
    - Colores fijos en `Reader.tsx` (`#D66E53`, `#3A3935`).
    - Un inicio estilo Netflix con 4 libros se ve vacío.
    - `user-select: none` impide buscar en el diccionario.
  - **Pregunta estratégica:** canal propio frente a Kindle, Google o Apple. Se sugiere un modelo híbrido.
  - Las tareas que salen de aquí se agregaron al ROADMAP.
- **Análisis de los EPUB:** [`docs/analisis/2026-11-23-epub-el-principe-feliz.md`](analisis/2026-11-23-epub-el-principe-feliz.md).
  - **Resumen:** EPUB 3 reflujable de InDesign 21.6, en 3 archivos con el mismo nombre de XHTML interno.
  - **Problemas:**
    - Sin encabezados semánticos.
    - Fuentes ofuscadas que el navegador no carga; 3 de ellas comerciales (Monotype Corsiva, Times New Roman y Microsoft Himalaya).
    - `color:#000000` fijo (ilegible en el tema Carbón).
    - La portada es la página 1 rasterizada y la capitular se pierde.
    - Las portadillas con golondrinas se separan del título.
    - Marcas de página impresa a mitad de frase.
    - Párrafos vacíos.
    - `alt=""` en todas las imágenes.
    - Metadatos pobres.
    - Colofón "Impreso en…" con otra dirección.
  - **Veredicto:** no se pueden subir tal cual.
- **ADR 0010 (Propuesta):** ingesta EPUB/Word → formato canónico de bloques tipados con ids estables → lector y EPUB limpio. foliate-js deja de ser necesario para libros propios.
- **Opinión sobre el editor:** [`docs/analisis/2026-11-23-editor-tipo-indesign.md`](analisis/2026-11-23-editor-tipo-indesign.md). Un clon de InDesign no es viable. Se recomienda un "taller editorial" estructurado por fases, después de lanzar +reads y cotizado aparte.
- **ADR 0011 (Propuesta):** alcance del editor.
- **Guía para la editorial:** [`docs/editorial/guia-exportar-epub-desde-indesign.md`](editorial/guia-exportar-epub-desde-indesign.md). Cómo exportar desde InDesign y qué mandar, con las dudas pendientes del libro.
- **`.gitignore`:** se agregó `contenido-privado/` para guardar en local los EPUB y Word de la editorial. **El repo es público: el contenido con derechos nunca se sube.**
- Actualizados `docs/ESTADO.md`, `docs/ROADMAP.md` y `AGENTS.md` (mapa de `docs/`).

**Verificado:**

- Se descomprimieron los 3 EPUB y se revisaron OPF, `encryption.xml`, CSS, XHTML, navegación e imágenes.
- Se renderizaron los XHTML con Chromium (Playwright) a 390 px y 1024 px:
  - Las 9 cargas de fuentes fallan (`OTS parsing error: invalid sfntVersion`).
  - El texto cae a Times.
  - No hay desbordamiento horizontal.
  - La portadilla del prólogo sale como una pantalla de pájaros y el título suelto debajo.
- `pandoc 3.1.3` extrae el texto completo, pero conserva las clases de InDesign.
- **EPUBCheck NO se corrió:** el entorno de la sesión no permitió ejecutar el validador descargado. Pendiente en local.
- Las capturas y los archivos no se subieron al repo (contenido con derechos y repo público).

**Pendiente / siguiente:**

- Erick decide los ADR 0010 y 0011.
- Mandar la guía a la editorial y resolver las dudas:
  - Traductora: "Yarely Campos" en el EPUB contra "Isabel Campos" en el catálogo.
  - Ilustraciones "NEKO".
  - Dirección.
  - Autorización digital.
- Correr EPUBCheck en local.
- Copiar los EPUB a `contenido-privado/` en la máquina de Erick.

## 2026-10-22 — Repo público y demo en GitHub Pages

**Pedido:** "hazlo público en GitHub para poder mostrar la demo". El dueño eligió la opción "Público + GitHub Pages".

**Hecho:**

- **Soporte de subruta** (ADR 0009):
  - `src/lib/site.ts` (`BASE_PATH`, `asset()`, `absoluteUrl()`, `originUrl()`, `NOINDEX`).
  - Router con `base`; portadas, logo e íconos con `asset()`; enlaces internos convertidos a `<A>`.
  - `vite.config.ts`: `base`, `baseURL` de Nitro y prerender cuando `NITRO_PRESET=github_pages`.
- **`src/routes/[...404].tsx`:** responde 200 solo al generar `/404.html` para Pages.
- **`src/vite-env.d.ts`:** tipos de `VITE_SITE_ORIGIN` y `VITE_NOINDEX`.
- **Nuevo workflow `.github/workflows/pages.yml`:** compila el demo estático y lo publica en Pages.
- **Limpieza antes de hacer público:**
  - Se quitó de la documentación el nombre de otra cuenta de GitHub del dueño.
  - El README ahora tiene el link del demo y el aviso de derechos reservados (sin licencia).
- **Repo cambiado a público y Pages activado** con origen "GitHub Actions".
- **Documentación actualizada:** AGENTS, README, ESTADO, ROADMAP y ADR 0009.

**Verificado:**

- `npm run check` ✅ (typecheck, lint, 11 tests y build normal).
- **Build normal sin cambios:** canonical a `reads.editorialhuapango.com.mx`, sin `noindex`, portadas en `/books/…` y 404 real.
- **Build de Pages:** 9 rutas prerenderizadas, más `404.html` y `.nojekyll`; `noindex` y canonical a `2-erick-2.github.io/huapango-reads/…`.
- **Playwright** sirviendo `.output/public` bajo `/huapango-reads/` (escritorio y celular): **32/32 ✅**, 0 imágenes rotas y sin errores de JavaScript.
- **Deploy:**
  - Workflows "CI" y "Demo en GitHub Pages" ✅.
  - En vivo: `/` → 200, las fichas → 301 a la ruta con `/` final (comportamiento normal de Pages) y una ruta inexistente → 404.
  - **Playwright contra el sitio en vivo: 32/32 ✅.**
- **Lighthouse móvil sobre el demo en vivo** (antes de las correcciones):
  - Rendimiento 97 / 96 / 100 (inicio / ficha / lector), CLS 0.
  - SEO 63 a 66 **a propósito** (`noindex`).
  - Caché corta: la impone GitHub Pages.
- **Correcciones de accesibilidad tras Lighthouse:**
  - Enlaces dentro de texto subrayados (pie de página y Mercado Libre).
  - Color de "Capítulo" por tema con contraste AA (`THEMES[].accent`: 5.9 / 5.18 / 5.05).
  - Botones A−/A+ con el texto visible dentro de su nombre accesible.
  - Re-verificado: `npm run check` ✅ y Playwright en la simulación de Pages 32/32 ✅.

**Pendiente / siguiente:** mostrar el demo al cliente; Lighthouse sobre el demo publicado; producción en Vercel cuando el dueño lo autorice.

## 2026-10-22 — Repo privado en GitHub (sin deploy)

**Pedido:** "haz el commit y crea el repo privado, aún no quiero tenerlo en Vercel, por ahora solo en GitHub para poder verlo desde ahí".

**Hecho:**

- Primer commit en la rama `main` con todo el Hito 1A.
- Repo **privado** `2-Erick-2/huapango-reads` creado con `gh` y push de `main`.
- `docs/ESTADO.md` y `docs/ROADMAP.md` actualizados: el deploy queda pospuesto por decisión del dueño.

**Verificado:**

- Antes del commit se revisó que no se incluyeran secretos, `.env`, `node_modules` ni builds.
- Push de `main` OK. **CI de GitHub Actions ✅ en el primer push:** `npm ci`, typecheck, lint, formato, tests y build.

**Notas para otros agentes:**

- Subir workflows (`.github/workflows/`) requiere el permiso `workflow` en `gh`: se hizo `gh auth refresh -s workflow`.
- Si el llavero de git tiene guardada otra cuenta de GitHub, este repo usa la sesión de `gh` (`2-Erick-2`) **solo a nivel local**: `git config --local credential.https://github.com.helper '!gh auth git-credential'`. No se cambió la configuración global para no afectar otros proyectos.

**Pendiente / siguiente:** deploy en Vercel cuando el dueño lo autorice; revisión del demo con el cliente.

## 2026-10-22 — Arranque del proyecto: diseño, base SolidStart, catálogo y lector demo (Hito 1A)

**Pedido:** el dueño pidió un demo para el cliente con "pantalla de inicio estilo Netflix, minimalista", "ficha del libro con ejemplos" usando portadas y datos de la landing, e incluir "el demo del motor de lectura aunque aún no tengamos los Word". También pidió: SolidStart, la identidad visual de la landing, usar Claude Design para las pantallas, documentarlo todo para que otro agente pueda continuar, y que las skills existan **solo en este workspace**. Precio en el demo: opción B, "Precio por confirmar".

**Hecho:**

- **Diseño en Claude Design** (lienzo privado del dueño): https://claude.ai/artifact/CpdQ77dtym3sgLXDPW852m, con 5 pantallas (Inicio, Ficha y Lector en escritorio; Inicio y Lector en celular) y prototipo navegable entre las de escritorio. Detalle en `docs/DISENO.md`.
- **Skills a nivel proyecto:**
  - Se movió `huapango-reads` de `~/.claude/skills/` (global, afectaba todas las sesiones) a `.claude/skills/huapango-reads/`. La copia global quedó en `~/.claude/skills/.trash/` (recuperable).
  - Se creó `.claude/skills/documentacion-continua/` con el protocolo de documentación.
- **Proyecto:**
  - SolidStart 2.0.6 con la plantilla oficial v2, Vite 8.3.5, Nitro 3 beta, Tailwind 4.3.3 y TypeScript 6.0.3, todo con versión fija. Node 24 vía nvm (`.nvmrc`).
  - ESLint (typescript-eslint strict + eslint-plugin-solid), Prettier y Vitest.
  - `npm run check` corre todo.
- **Diseño en código:** tokens de la landing en `src/styles/app.css`, fuentes autoalojadas, logo y portadas copiados a `public/`.
- **Catálogo:** `src/lib/catalog/` con tipos (forma de las tablas futuras), datos reales (4 libros, 5 colecciones, 5 próximos) y funciones async.
- **Pantallas:**
  - `src/routes/index.tsx`: Inicio con hero y filas.
  - `src/routes/libro/[slug].tsx`: ficha con SSR, SEO y 404.
  - `src/routes/leer/demo.tsx`: lector.
  - `src/routes/[...404].tsx`: página no encontrada.
- **Motor de lectura v0:** `src/lib/reader/pagination.ts` y `src/components/reader/Reader.tsx` (ADR 0005), con texto de demostración etiquetado (`src/lib/reader/demo-text.ts`).
- **Documentación:** `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/` (ESTADO, BITACORA, ROADMAP, ARQUITECTURA, DISENO) y ADR 0001 a 0008.
- **CI:** `.github/workflows/ci.yml` (typecheck, lint, formato, tests y build).

**Verificado:**

- `tsc --noEmit` ✅, `eslint .` ✅, `prettier --check` ✅, `vitest` 11/11 ✅, `vite build` ✅.
- Servidor de producción local: `/`, `/libro/nahual`, `/libro/terregal` y `/leer/demo` responden 200; `/libro/no-existe` responde 404.
- **Playwright** (Chrome, en escritorio 1440×900 y celular 390×844), **30/30 ✅**:
  - Navegación de inicio a ficha; el prólogo de Terregal se muestra.
  - En el lector: avanzar y regresar con flechas, A+ repagina (6 → 8 en escritorio y 8 → 11 en celular), toque al centro activa el modo inmersivo y Escape lo cierra, toque a la derecha avanza, el índice salta al capítulo III, las preferencias se guardan y un libro inexistente da 404.
- **Capturas** de las 3 pantallas en 1440, 1024, 768 y 390 revisadas visualmente.
- **Sin errores de JavaScript** en consola, salvo el 404 esperado de la prueba de libro inexistente.
- **No verificado aún:** Lighthouse (se hará con el deploy) y lectores de pantalla reales.

**Pendiente / siguiente:**

- Autorización del dueño para el primer commit y para crear el repo en GitHub.
- Proyecto en Vercel + CNAME `reads` en Neubox.
- Mostrar el demo al cliente.
- Ver los datos por confirmar en `docs/ESTADO.md`.
