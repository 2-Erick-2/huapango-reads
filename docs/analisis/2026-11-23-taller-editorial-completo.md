# Análisis a fondo: taller editorial completo con PDF de imprenta (2026-11-23)

> **Decisión de Erick (2026-11-23):** sí se desarrolla un **editor completo, solo para los libros de Huapango**, que exporte **PDF de imprenta correcto**, EPUB y el libro para +reads. Este documento reemplaza la recomendación de "no hacerlo" del [análisis anterior](2026-11-23-editor-tipo-indesign.md) y del ADR 0011. Decisión técnica: [ADR 0013](../decisiones/0013-taller-editorial-completo-con-pdf-de-imprenta.md). Prototipo que funciona: [`prototipos/taller-impresion/`](../../prototipos/taller-impresion/README.md).

## 1. Qué cambió y por qué ahora sí es viable

En el análisis anterior se descartó un "clon de InDesign" por el costo de construir un motor de composición y de PDF de imprenta. **No hay que construirlo.** Ya existe uno abierto, rápido y de calidad editorial: **Typst** (licencia Apache 2.0). Lo probé con _El príncipe feliz_:

| Prueba (2026-11-23)    | Resultado                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Composición del cuento | 14 páginas de 5.5 × 8.5 in, Libertinus y Tangerine, separación silábica en español correcta, justificado sin ríos                           |
| PDF/X                  | Typst **no** lo hace (0.15.2 solo PDF/A y PDF/UA). **Ghostscript** lo convierte a **PDF/X-3:2002** con `OutputIntents` y `TrimBox`, sin RGB |
| Tinta                  | Texto **100 % K** (C = M = Y = 0): no hay "negro enriquecido" en el texto, que es lo que pide la imprenta                                   |
| Portada extendida      | Contraportada + lomo calculado + portada, sangrado de 3 mm, marcas de corte, EAN-13 propio que se lee con escáner                           |
| Velocidad              | Cuento: 0.04 s. Libro de ~33,000 palabras (131 págs.): **0.40 s**. Conversión a PDF/X: 2.1 s                                                |

**Conclusión:** el motor de composición y el PDF de imprenta están resueltos con piezas existentes. Lo que hay que construir es **el editor, las plantillas, el ajuste fino, el control de calidad y el flujo**. Eso sí lo puede hacer una persona con Claude, por fases.

**Lo que no se hace (y la editorial debe saberlo):** maqueta libre tipo "arrastrar marcos a cualquier lugar". El taller compone libros con **plantillas por colección** y permite ajuste fino. Para la mayoría de los libros de Huapango (narrativa, cuento, ensayo, traducciones) es mejor así: más rápido y consistente.

## 2. Arquitectura: una sola fuente, tres salidas

```
                        ┌──────────────────────────── Taller (panel de la editorial, en +reads) ───────────────────────────┐
 Word / EPUB InDesign ─►│ Importar ─► Documento canónico (bloques, ADR 0010) ─► Editor (ProseMirror) ─► Versiones / revisión │
                        │                         │                                                                          │
                        │                         ├─► Plantilla de colección (Typst) + ajustes ─► Vista previa en vivo      │
                        │                         │                                                                          │
                        └─────────────────────────┼──────────────────────────────────────────────────────────────────────────┘
                                                  ├─► PDF de imprenta: Typst → PDF → Ghostscript → PDF/X + preflight propio
                                                  ├─► EPUB 3 válido (generador propio)
                                                  └─► Lector +reads (capítulos + marca de agua)
```

### 2.1 Documento canónico

- El mismo formato de bloques del [ADR 0010](../decisiones/0010-ingesta-epub-a-formato-canonico.md), ampliado para libro impreso:
  - `heading`, `paragraph`, `byline`, `epigraph`, `quote`, `verse` (poesía, con sangrías y versos partidos).
  - `footnote` (ECOS es ensayo), `image`, `titlePage`, `ornament`, `sceneBreak`, `pageBreak`.
  - Más las partes del libro: `frontMatter` (portadilla, legales, dedicatoria, índice), `body` y `backMatter`.
- Se guarda en Supabase como JSON versionado. Cada guardado es una versión, y se puede comparar y regresar.
- Las **piezas complementarias** (prólogo y nota de la traductora) son documentos propios ligados al libro ([ADR 0012](../decisiones/0012-piezas-complementarias-como-minilibros.md)). En digital salen como minilibros. En impreso, la plantilla puede incluirlos dentro del libro si la editorial lo decide.

### 2.2 Editor

- **ProseMirror**, sin React; se envuelve en un componente Solid. Usa un esquema estricto igual al formato canónico: no se puede meter "formato a mano", solo estilos con nombre.
- Funciones de editor de libro:
  - Estilos con atajos.
  - Rayas de diálogo automáticas (— y no -), comillas latinas o inglesas según la regla de la colección.
  - Búsqueda y reemplazo.
  - Notas al pie.
  - Contador de palabras.
  - Comentarios de corrección.
  - Control de cambios: fase posterior.
- **Edición colaborativa en tiempo real (Yjs):** después. Al inicio basta con un solo editor por documento y un bloqueo.

### 2.3 Plantillas de diseño (lo que reemplaza la "maqueta" de InDesign)

- Una plantilla Typst por colección: Raíces, Cuentos a todas partes, ECOS, Gabinete Gótico y Tinta blanca.
- **Qué define cada plantilla:**
  - Tamaño final y márgenes (interior y exterior).
  - Fuentes y tamaños, interlineado y retícula base.
  - Capitulares.
  - Apertura de capítulo (página impar, descolgado, ornamentos).
  - Folios y cornisas.
  - Portadillas y páginas legales.
- **La editorial no programa.** Ajusta parámetros en formularios (tamaño de letra, márgenes, fuente del título) con vista previa en vivo. La plantilla la diseñamos una vez con ellos, copiando el estilo que ya usan en InDesign.

### 2.4 Ajuste fino (lo que un tipógrafo sí necesita)

El 90 % lo resuelve la plantilla. Para el 10 % restante, el editor permite marcar en un párrafo o línea:

- Apretar o aflojar el párrafo (_tracking_ ±).
- Forzar salto de página o de línea.
- "Mantener con el siguiente".
- Guion manual o "no partir esta palabra".
- Mover una imagen a la página siguiente.
- Aceptar o corregir viudas y huérfanas que el control de calidad detecte.

Son exactamente las correcciones que se hacen en InDesign al cerrar un libro, pero guardadas como datos. Por eso sobreviven a los cambios de texto.

### 2.5 Vista previa en vivo

- Typst recompila en milisegundos. **Opción A:** compilar en el servidor y mandar las páginas como SVG o PNG. **Opción B:** compilar **en el navegador** con Typst en WebAssembly (proyecto `typst.ts`), sin servidor.
- Hay que **evaluar B en el spike**. Si funciona bien, la vista previa es instantánea y gratis de operar.

### 2.6 Exportar PDF de imprenta (lo crítico)

1. Typst compila el PDF con **colores CMYK** declarados (`cmyk(...)`), texto en 100 % K y cajas `TrimBox`/`BleedBox`.
2. **Ghostscript** convierte a **PDF/X** (probado X-3) con el **perfil ICC de la imprenta** y pasa las imágenes RGB a CMYK.
3. **Preflight propio** antes de entregar (falla si algo no cumple):
   - Todas las fuentes incrustadas.
   - Sin RGB.
   - Imágenes ≥ 300 ppp a su tamaño impreso. Esto ya detectó un problema real: las golondrinas quedan a **147 ppp**.
   - Cobertura total de tinta ≤ lo que pida la imprenta (p. ej. 300 %).
   - Texto en K puro.
   - Sangrado presente donde hay imágenes a sangre.
   - Número de páginas múltiplo del pliego (8, 16 o 32, según la imprenta).
4. **Validación externa:** con el primer libro, revisar el PDF con un preflight comercial (Acrobat Pro de prueba o callas pdfToolbox) y **pedir una prueba física a la imprenta**. Solo entonces se declara el flujo "listo para imprenta".

### 2.7 Portadas: ¿en la plataforma o en Affinity?

**Respuesta: las dos cosas, cada una en lo suyo.**

| Parte de la portada                                  | Dónde se hace                         | Por qué                                                                           |
| ---------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| **Ilustración o arte** (golondrinas, fotos, pintura) | **Affinity** (gratis) o quien ilustra | Es dibujo y retoque de imagen: otro tipo de programa. No vale la pena construirlo |
| **Armado de la portada extendida**                   | **Taller (plataforma)**               | Es cálculo y tipografía: lo hace mejor el código                                  |

**Qué hace el taller con la portada (ya prototipado):**

- **Lomo automático:** páginas ÷ 2 × calibre del papel. Si cambia el número de páginas, el lomo se ajusta solo. Este es el error más común al armar portadas a mano.
- Tamaño total con sangrado y marcas de corte.
- Título, autor, logo y colección según la plantilla de la colección.
- Contraportada con la sinopsis tomada de la ficha del libro.
- **Código de barras del ISBN generado** (EAN-13, verificado con escáner).
- Exporta a PDF/X en CMYK, igual que el interior.
- Además, la **misma portada** sale en JPG para la ficha de +reads y para el EPUB. Así no se vuelve a hacer la portada "rasterizando la página 1".

**Lo que deben entregar desde Affinity:** la ilustración sola, a **300 ppp al tamaño final + sangrado**, sin texto encima. Según reseñas y el fabricante, Affinity es gratuito desde fines de 2025 y exporta PDF/X-4. No pude confirmarlo en una página oficial: hay que verificarlo al instalarlo.

### 2.8 Dónde corre

- **Editor y vista previa:** dentro de +reads (SolidStart), en rutas `/taller/*` con acceso solo para la editorial (rol en Supabase).
- **Servicio de impresión:** un contenedor pequeño con el binario de Typst y Ghostscript (Fly.io, Railway o Cloud Run). Toma trabajos de una cola en Supabase y deja los PDF en Storage privado.
  - Ni Vercel Functions ni las Edge Functions de Supabase (Deno) son buen lugar para Ghostscript.
  - Costo esperado bajo: los trabajos tardan segundos y son pocos al mes.
- **Fuentes:** solo con licencia que permita incrustarlas en PDF y servirlas en web. Las OFL (Libertinus, Tangerine, EB Garamond, Newsreader…) sirven para todo. **Ojo:** si hoy usan **Minion Pro** desde Adobe Fonts, esa licencia depende de la suscripción de Adobe. Al cancelarla pierden el derecho a usarla en libros nuevos. Conviene migrar a fuentes libres equivalentes al diseñar las plantillas.

## 3. Motores considerados

| Motor                             | Calidad tipográfica | PDF/X / CMYK                                                                       | Licencia / costo                                                                   | Veredicto                                       |
| --------------------------------- | ------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Typst + Ghostscript**           | Muy buena (probado) | Typst: CMYK sí, PDF/X no. Ghostscript lo convierte (X-3 probado)                   | Typst Apache 2.0. Ghostscript AGPL (ver riesgos)                                   | **Elegido**                                     |
| Paged.js / Vivliostyle (Chromium) | Buena (CSS)         | Chromium no produce CMYK ni PDF/X. Vivliostyle CLI ofrece _press-ready_ (PDF/X-1a) | Vivliostyle es AGPL                                                                | Alternativa si se quisiera diseñar con CSS      |
| Prince (PrinceXML)                | Muy buena (CSS)     | Soporta PDF/X                                                                      | **$3,800 USD por servidor** y prohíbe documentos comerciales sin licencia de sitio | Caro y restrictivo                              |
| LaTeX / ConTeXt                   | Excelente           | Sí, con paquetes                                                                   | Libre                                                                              | Lento, difícil de plantillar para un editor web |
| Motor propio                      | —                   | —                                                                                  | —                                                                                  | Descartado: años de trabajo                     |

## 4. Fases y entregables (con Claude como equipo)

Las estimaciones son en **semanas de trabajo enfocado** de Erick con Claude. Son rangos, no promesas, y dependen de las respuestas de la imprenta y la editorial.

| Fase                                    | Entregable                                                                                                                                                               | Estimación |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **0. Spike de imprenta** (empezado hoy) | _El príncipe feliz_ completo con la plantilla de la colección, capitular resuelta, perfil ICC de **su** imprenta, PDF/X que pida la imprenta, **prueba física aprobada** | 1–2        |
| 1. Formato canónico e importador        | Esquema de bloques compartido (TypeScript), importador EPUB de InDesign y Word con mapeo por libro, pruebas con libros de ejemplo                                        | 2–3        |
| 2. Editor v1                            | ProseMirror en Solid, estilos, notas, versiones y guardado en Supabase; rol "editorial"                                                                                  | 3–5        |
| 3. Plantillas y vista previa            | Plantillas de 2 colecciones, formulario de parámetros, vista previa en vivo (WASM o servidor)                                                                            | 3–4        |
| 4. Imprenta v1                          | Servicio de impresión (cola, Typst, Ghostscript, Storage), preflight propio, descarga de PDF/X                                                                           | 2–3        |
| 5. Portadas                             | Plantilla de portada extendida por colección, lomo automático, EAN-13 e imágenes con validación de ppp                                                                   | 1–2        |
| 6. EPUB y lector                        | EPUB 3 válido (EPUBCheck en CI) y publicación directa al lector +reads                                                                                                   | 2–3        |
| 7. Ajuste fino y QA                     | Controles de ajuste por párrafo, detector de viudas, huérfanas y ríos, comparación entre versiones                                                                       | 2–4        |

**Total aproximado: 16 a 26 semanas** para un taller que produzca un libro de narrativa completo (interior y portada a PDF/X, EPUB y +reads).

- Poesía con maquetación compleja, libros muy ilustrados y la edición colaborativa en tiempo real van después.
- Esto **compite en tiempo con los Hitos 2 y 3 de +reads.** Recomendación de orden: Fase 0 ya (es barata y quita el mayor riesgo); luego Fase 1 junto con el Hito 2 (es la misma ingesta); después decidir si sigue el taller o los pagos.

## 5. Riesgos y cómo se cubren

| Riesgo                                         | Mitigación                                                                                                                                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La imprenta rechaza el PDF                     | Fase 0 con **su** perfil ICC, **su** versión de PDF/X y **una prueba física** antes de construir lo demás                                                                                 |
| Error en un tiraje (costo alto)                | Preflight obligatorio, aprobación explícita de la editorial antes de exportar y deslinde en el contrato (la aprobación final es suya)                                                     |
| **Ghostscript es AGPL**                        | Usarlo sin modificar, como programa aparte en el servicio, en general no obliga a liberar el código de +reads. **Confirmarlo con un abogado**, o comprar la licencia comercial de Artifex |
| Expectativa de "InDesign" (marcos libres)      | Mostrarles pronto el flujo con plantillas. Lo que no cubra (libros muy ilustrados) sigue en Affinity                                                                                      |
| Capitular, poesía y notas al pie en Typst      | Probar cada una en la Fase 0 o la 1 con texto real; hay paquetes y se puede escribir lo propio                                                                                            |
| Calidad tipográfica percibida                  | Plantillas diseñadas copiando sus libros actuales; comparar página contra página con InDesign                                                                                             |
| Mantenimiento a largo plazo de una persona     | Pruebas visuales automáticas (PDF → PNG comparado contra referencia), preflight en CI y documentación continua                                                                            |
| Dependencia de versiones (Typst cambia rápido) | Versión fija del binario, plantillas con pruebas y actualización deliberada                                                                                                               |

## 6. Cómo trabajar con Claude para construirlo

- **Repo:** el taller vive en `huapango-reads` (comparte login, Supabase y formato con el lector), dividido así:
  - `src/lib/libro/`: formato canónico, tipos y validadores.
  - `src/routes/taller/`: el editor.
  - `servicios/impresion/`: contenedor con Typst y Ghostscript.
  - `plantillas/`: un `.typ` por colección.
- **Libros de prueba en el repo:** solo textos de **dominio público** (p. ej. Wilde en inglés original) o escritos para prueba. Los libros de la editorial nunca, porque el repo es público.
- **Pruebas que protegen la calidad:**
  - Unitarias del importador y del formato.
  - **Regresión visual** (cada página renderizada a PNG y comparada).
  - **Preflight** en CI (fuentes, CMYK, ppp, TrimBox).
  - EPUBCheck en CI.
- **Ciclo de trabajo:** tareas pequeñas con entregable visible (una página, una portada, un PDF). Claude escribe código, pruebas y documentación. Erick revisa contra los libros reales y contra la imprenta.
- **Siguiente paso concreto (Fase 0):**
  1. Pedir a la editorial y a la imprenta los datos del bloque 7.
  2. Resolver la capitular.
  3. Componer _El príncipe feliz_ completo con su perfil ICC.
  4. Mandar el PDF/X a prueba.

## 7. Datos que hay que pedir (imprenta y editorial)

- **Imprenta:**
  - Versión de PDF/X (X-1a, X-3 o X-4).
  - Perfil ICC.
  - Sangrado (3 mm o 0.125 in).
  - Cobertura máxima de tinta.
  - Tamaño de pliego y múltiplos de páginas.
  - Calibre del papel de interior y de forros.
  - Si aceptan negro enriquecido en portada.
  - Formato de prueba (digital o física).
- **Editorial:**
  - Los `.indd` o PDF finales de uno o dos libros, para copiar el diseño en las plantillas.
  - Las fuentes que usan y su licencia.
  - Las ilustraciones originales a 300 ppp.
  - Los tamaños por colección.
  - Quién aprueba los PDF finales.

## 8. Negocio (para la conversación con los dueños)

- **Es otro producto, no parte del lector.** Cotizarlo aparte, por fases con entregables (la Fase 0 sirve de demostración).
- **Propiedad intelectual:** decidir en el contrato si el taller es de la editorial o de Erick con licencia de uso para Huapango. Un taller así **le puede servir a otras editoriales pequeñas**: conviene no ceder ese derecho sin pensarlo.
- **Ahorro para la editorial:**
  - Las licencias de InDesign (y quizá de Adobe Fonts).
  - Horas de maquetación.
  - El EPUB y la versión +reads salen gratis del mismo documento, sin rehacer nada.
