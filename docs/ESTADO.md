# Estado actual — Huapango +reads

> Foto del proyecto **hoy**. Se reescribe al final de cada tarea (skill `documentacion-continua`).
> **Última actualización:** 2026-11-23

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

## Taller editorial (decidido el 2026-11-23, ADR 0013)

Erick decidió construir un **editor completo solo para los libros de Huapango**, con exportación a **PDF de imprenta (PDF/X)**, EPUB y +reads. Hay un prototipo que funciona en `prototipos/taller-impresion/`:

- **Interior:** formato canónico → Typst → PDF → Ghostscript → **PDF/X-3**. Probado con _El príncipe feliz_: 14 páginas de 5.5 × 8.5 in, texto 100 % K y sin RGB.
- **Portada extendida:** lomo automático, sangrado, marcas de corte y EAN-13 que se lee con escáner.
- **Velocidad:** un libro de 131 páginas compila en 0.4 s.
- **Falta:**
  - La capitular.
  - El perfil ICC y la versión de PDF/X de **su** imprenta.
  - El preflight comercial y la **prueba física**.
- **Portadas:** el taller arma la portada; la **ilustración** se hace en Affinity (gratis) a 300 ppp. Las golondrinas que tenemos quedan a 147 ppp: hace falta el original.
- **Siguiente:** Fase 0 (spike con la imprenta). Plan completo, fases (16 a 26 semanas) y riesgos: `docs/analisis/2026-11-23-taller-editorial-completo.md`.

## Por confirmar con la editorial

- **Precio digital** de cada libro (hoy dice "Precio por confirmar").
- **ISBN digital** de cada libro.
- **Word** de al menos un capítulo (de preferencia _Nahual_) para la muestra real.
- **Porcentaje de regalías** por autor y autorización de distribución digital.
- **Disponibilidad de Stripe Connect** en México (preguntar a Stripe) y retenciones fiscales (contador).
- **Facturación (CFDI) e IVA** de los libros electrónicos (contador).
- **_El príncipe feliz_:**
  - Traductora: el EPUB dice "Yarely Campos" y el catálogo "Isabel Campos".
  - Autoría de las ilustraciones (archivos "NEKO").
  - Dirección del colofón (Elías Piña #100 contra Calle Novena #225).
  - Autorización digital de la traductora, la prologuista (Mercedes Varela) y quien ilustró.

## Bloqueos y siguientes pasos

1. **Mostrar el demo al cliente** con el link de GitHub Pages y recoger sus ajustes.
2. **Fase 0 del taller:** mandar el mensaje de `docs/editorial/solicitud-datos-imprenta.md` (pide un PDF ya impreso con éxito y el `.joboptions`) y pedir a la imprenta su versión de PDF/X, perfil ICC, sangrado, calibre y múltiplos de pliego; resolver la capitular; mandar _El príncipe feliz_ a prueba física.
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
