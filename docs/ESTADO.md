# Estado actual — Huapango +reads

> Foto del proyecto **hoy**. Se reescribe al final de cada tarea (skill `documentacion-continua`).
> **Última actualización:** 2026-11-24

## Para retomar en local (léelo primero)

1. Trae la rama de trabajo:

   ```bash
   git fetch origin && git checkout claude/loving-hamilton-5m2lei
   ```

2. Copia a `contenido-privado/` (no se suben; están en `.gitignore`):
   - Los 3 EPUB de _El príncipe feliz_.
   - El PDF de imprenta, en `contenido-privado/imprenta/EL_PRINCIPE_FELIZ_22OCTUBRE2026.pdf`.
3. Lee, en este orden:
   - `docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md` (lo último).
   - `docs/analisis/2026-11-23-taller-editorial-completo.md` (plan del taller).
   - `prototipos/taller-impresion/README.md` (cómo correr el prototipo).
4. **Siguiente tarea de código sugerida:** Fase 1 del taller = formato canónico en TypeScript (`src/lib/libro/`) + importador EPUB de InDesign, con pruebas (ADR 0010 y 0013).

## En una frase

**Hito 1A:** el demo navegable (inicio estilo Netflix, ficha de libro y lector de demostración) está **publicado en GitHub Pages: https://2-erick-2.github.io/huapango-reads/**. El repo es **público** (https://github.com/2-Erick-2/huapango-reads). La producción en `reads.editorialhuapango.com.mx` (Vercel) sigue **pospuesta por decisión del dueño**.

## Qué funciona (real)

| Pantalla       | Ruta                | Estado                                                                                                                                                                                                                                                                     |
| -------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio         | `/`                 | ✅ Hero con libro destacado (Nahual), filas Novedades / Colección Raíces / Cuentos a todas partes / Próximamente, flechas y swipe                                                                                                                                          |
| Ficha de libro | `/libro/[slug]`     | ✅ Los 4 libros reales con sinopsis, cita, ficha técnica, géneros, colección, "Más de la colección" y enlace a Mercado Libre (impreso). SSR + SEO (JSON-LD `Book`)                                                                                                         |
| Lector         | `/leer/demo`        | ✅ Paginación real (2 páginas en escritorio y 1 en celular), A−/A+ que repagina, 3 temas, índice, zonas de toque, swipe, teclado, modo inmersivo, barra de progreso, marca de agua, contenido oculto al cambiar de pestaña, sin copiar ni imprimir, preferencias guardadas |
| 404            | cualquier otra ruta | ✅ Responde con estado HTTP 404 real                                                                                                                                                                                                                                       |

**Lighthouse móvil (demo en vivo, 2026-10-22):** rendimiento 96 a 100, CLS 0. El SEO sale bajo a propósito por el `noindex` del demo. Se corrigieron los avisos de accesibilidad (ver bitácora).

Calidad verificada el 2026-10-22: `typecheck`, `lint`, `prettier`, 11 pruebas unitarias, build y **30/30 pruebas de interacción con Playwright** (escritorio 1440 y celular 390).

## Qué es demo o mock (NO real todavía)

- **Texto del lector:** escrito para el demo, **no es de ningún libro ni autor**. Está etiquetado como "Texto de demostración". Se cambia cuando la editorial entregue el Word (Hito 2).
- **Marca de agua:** con datos de muestra (`lector@ejemplo.com`, `ID HR-DEMO`). Con login usará los datos reales del lector.
- **"Leer muestra"** en cualquier libro abre el mismo lector de demostración.
- **"Comprar"** está deshabilitado ("disponible pronto"). **"Mi biblioteca"** no funciona.
- **Catálogo:** datos locales en `src/lib/catalog/data.ts`; Supabase llega en el Hito 2.
- **Insignia "Demo"** visible en el encabezado.
- **GitHub Pages** sirve una versión **estática** (prerenderizada) con `noindex`; no tiene servidor. Producción usará SSR en Vercel (ADR 0009).

## Contenido real recibido (2026-11-23)

- **_El príncipe feliz_:** el libro es **solo** `EL_PRINCIPE_FELIZ_CONTENIDO.epub`. El prólogo (Mercedes Varela) y la nota de la traductora son **minilibros aparte** ligados al libro (ADR 0012).
- **Los EPUB de InDesign no se pueden subir tal cual:**
  - Las fuentes están ofuscadas y algunas son comerciales.
  - Tienen texto negro fijo.
  - La portada es la página 1 rasterizada.
  - Las portadillas se rompen y no hay semántica.
  - Entran por la ingesta al formato canónico de bloques (ADR 0010, **Aceptada**).
- Análisis: `docs/analisis/2026-11-23-epub-el-principe-feliz.md`.
- Los archivos **no están en el repo** (es público). En local van en `contenido-privado/` (en `.gitignore`).
- Guía para que la editorial exporte bien: `docs/editorial/guia-exportar-epub-desde-indesign.md` (aún no se les manda).

## Taller editorial (decidido el 2026-11-23; ADR 0013 y 0014)

Editor completo solo para los libros de Huapango, que exporta PDF de imprenta, EPUB y +reads. Prototipo en `prototipos/taller-impresion/`.

- **PDF real de imprenta analizado** (2026-11-24): `docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md`.
  - **No es PDF/X:** PDF 1.4 con RGB, sin sangrado y 62 páginas. Lo imprimen en su propio taller.
  - **Decisión (ADR 0014):** salida "compatible" por omisión; PDF/X como opción.
- **Plantilla "Cuentos a todas partes" calibrada** contra ese PDF:
  - Libertinus 14/18, márgenes de 70/76 pt.
  - Sangría más línea en blanco entre párrafos.
  - Cornisas par/impar y apertura en página impar.
  - Comparación visual de las págs. 27–29: casi idéntica.
  - División de palabras apagada como en su impreso (se recomienda activarla).
- **Pipeline probado:** canónico → Typst → PDF → Ghostscript → PDF/X-3. Portada extendida con lomo automático y EAN-13. Un libro de 131 págs. compila en 0.4 s.
- **Script reutilizable** `analizar_pdf_referencia.py`: saca especificaciones de cualquier PDF de imprenta.
- **Falta:**
  - Capitular descolgada.
  - Ornamento de la cornisa (golondrina y puntos) y folio en Explora.
  - Páginas preliminares (legal, portadillas).
  - Portada real (falta el PDF de forros).
  - Papel y calibre.
  - Prueba física.
- **Plan:** fases de 16 a 26 semanas en `docs/analisis/2026-11-23-taller-editorial-completo.md`.

## Por confirmar con la editorial

- **Precio digital** de cada libro (hoy dice "Precio por confirmar").
- **ISBN digital** de cada libro.
- **Word** de al menos un capítulo (de preferencia _Nahual_) para la muestra real.
- **Porcentaje de regalías** por autor y autorización de distribución digital.
- **Disponibilidad de Stripe Connect** en México (preguntar a Stripe) y retenciones fiscales (contador).
- **Facturación (CFDI) e IVA** de los libros electrónicos (contador).
- **_El príncipe feliz_:**
  - ✅ Resuelto por la página legal: la traductora es **Yarely Isabel Campos Servín** (catálogo actualizado) y la ilustración es de **Diego "Neko" Aguilar**. Elías Piña #100 es donde se imprime.
  - Autorización digital de la traductora, la prologuista (Mercedes Varela) y el ilustrador.
  - ISBN **digital** (el 979-8-9961338-4-0 es del impreso).
  - ¿Ya está publicado? (el catálogo dice "En prensa").
  - PDF de la portada (forros), papel y calibre, equipo de impresión y armado de pliegos (62 págs. no es múltiplo de 4).
  - Original del frontispicio a 300 ppp y logo vectorial.
  - Erratas del impreso: cornisa "EL PRINCIPE FELIZ" sin tilde; `¨Neko¨` con diéresis en la página legal.

## Bloqueos y siguientes pasos

1. **Mostrar el demo al cliente** con el link de GitHub Pages y recoger sus ajustes.
2. **Fase 0 del taller:**
   - ✅ PDF de referencia recibido y analizado.
   - Falta pedir (ver `docs/editorial/solicitud-datos-imprenta.md`):
     - El PDF de forros y el `.joboptions`.
     - El papel y su calibre.
     - El equipo de impresión y el armado de pliegos.
   - Resolver la capitular y las preliminares.
   - Mandar _El príncipe feliz_ compuesto en el taller a **prueba física**.
3. Mandar a la editorial la guía de exportación y las dudas de _El príncipe feliz_ (incluye si los minilibros son gratis, se venden o vienen incluidos).
4. **Correr EPUBCheck en local** sobre los EPUB recibidos (no se pudo en la sesión del 2026-11-23).
5. **Producción (pospuesta por el dueño):** proyecto en Vercel + CNAME `reads` en Neubox, **sin tocar los MX de Zoho ni los nameservers**.

## Riesgos conocidos

- **`npm audit`:** 4 alertas "high" en una sola cadena (`braces` → `micromatch` → `fast-glob` → `@solidjs/start`). Se usan **solo al compilar** para descubrir rutas; no procesan entradas de usuarios. Npm solo propone bajar a SolidStart 1.x, así que **se acepta el riesgo** y se revisa en cada actualización de SolidStart.
- **Nitro v3 en beta** (ADR 0002). Stack muy nuevo en general (SolidStart 2, TS 6, Vite 8) para una sola persona.
- **OXXO es asíncrono:** sin manejar `async_payment_succeeded`/`failed`, habría compras pagadas sin acceso.
- **Pruebas de Playwright fuera del repo:** las 32 pruebas reportadas no se pueden repetir en CI.
- **Taller editorial:**
  - Compite en tiempo con los Hitos 2 y 3.
  - Ghostscript es AGPL (confirmar con un abogado o comprar licencia).
  - La imprenta podría rechazar el PDF: por eso se hace primero la Fase 0.
  - Definir en el contrato la propiedad intelectual del taller.
- **Repo público:** cualquiera puede leer el código y `docs/` (incluye notas de negocio no confidenciales). Nunca subir secretos, precios internos ni datos de autores sin autorización.

## Enlaces

- **Repositorio (público):** https://github.com/2-Erick-2/huapango-reads
- **Demo (GitHub Pages):** https://2-erick-2.github.io/huapango-reads/

- **Diseño (Claude Design):** https://claude.ai/artifact/CpdQ77dtym3sgLXDPW852m
- **Landing de la editorial:** https://www.editorialhuapango.com.mx
- **Prototipo anterior** (React, solo de referencia, NO se usa): carpeta local `~/Desktop/huapangoread`
