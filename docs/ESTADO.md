# Estado actual — Huapango +reads

> Foto del proyecto **hoy**. Se reescribe al final de cada tarea (skill `documentacion-continua`).
> **Última actualización:** 2026-10-22

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

## Por confirmar con la editorial

- **Precio digital** de cada libro (hoy dice "Precio por confirmar").
- **ISBN digital** de cada libro.
- **Word** de al menos un capítulo (de preferencia _Nahual_) para la muestra real.
- **Porcentaje de regalías** por autor y autorización de distribución digital.
- **Disponibilidad de Stripe Connect** en México (preguntar a Stripe) y retenciones fiscales (contador).

## Bloqueos y siguientes pasos

1. **Mostrar el demo al cliente** con el link de GitHub Pages y recoger sus ajustes.
2. **Producción (pospuesta por el dueño):** proyecto en Vercel + CNAME `reads` en Neubox, **sin tocar los MX de Zoho ni los nameservers**.

## Riesgos conocidos

- **`npm audit`:** 4 alertas "high" en una sola cadena (`braces` → `micromatch` → `fast-glob` → `@solidjs/start`). Se usan **solo al compilar** para descubrir rutas; no procesan entradas de usuarios. Npm solo propone bajar a SolidStart 1.x, así que **se acepta el riesgo** y se revisa en cada actualización de SolidStart.
- **Nitro v3 en beta** (ADR 0002).
- **Repo público:** cualquiera puede leer el código y `docs/` (incluye notas de negocio no confidenciales). Nunca subir secretos, precios internos ni datos de autores sin autorización.

## Enlaces

- **Repositorio (público):** https://github.com/2-Erick-2/huapango-reads
- **Demo (GitHub Pages):** https://2-erick-2.github.io/huapango-reads/

- **Diseño (Claude Design):** https://claude.ai/artifact/CpdQ77dtym3sgLXDPW852m
- **Landing de la editorial:** https://www.editorialhuapango.com.mx
- **Prototipo anterior** (React, solo de referencia, NO se usa): carpeta local `~/Desktop/huapangoread`
