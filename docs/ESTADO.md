# Estado actual — Huapango +reads

> Foto del proyecto **hoy**. Se reescribe al final de cada tarea (skill `documentacion-continua`).
> **Última actualización:** 2026-10-22

## En una frase

**Hito 1A en curso:** el demo navegable (inicio estilo Netflix, ficha de libro y lector de demostración) funciona **en local** y el código está en el repo privado **https://github.com/2-Erick-2/huapango-reads**. El deploy en Vercel queda **pospuesto por decisión del dueño** (por ahora solo GitHub).

## Qué funciona (real)

| Pantalla       | Ruta                | Estado                                                                                                                                                                                                                                                                     |
| -------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio         | `/`                 | ✅ Hero con libro destacado (Nahual), filas Novedades / Colección Raíces / Cuentos a todas partes / Próximamente, flechas y swipe                                                                                                                                          |
| Ficha de libro | `/libro/[slug]`     | ✅ Los 4 libros reales con sinopsis, cita, ficha técnica, géneros, colección, "Más de la colección" y enlace a Mercado Libre (impreso). SSR + SEO (JSON-LD `Book`)                                                                                                         |
| Lector         | `/leer/demo`        | ✅ Paginación real (2 páginas en escritorio y 1 en celular), A−/A+ que repagina, 3 temas, índice, zonas de toque, swipe, teclado, modo inmersivo, barra de progreso, marca de agua, contenido oculto al cambiar de pestaña, sin copiar ni imprimir, preferencias guardadas |
| 404            | cualquier otra ruta | ✅ Responde con estado HTTP 404 real                                                                                                                                                                                                                                       |

Calidad verificada el 2026-10-22: `typecheck`, `lint`, `prettier`, 11 pruebas unitarias, build y **30/30 pruebas de interacción con Playwright** (escritorio 1440 y celular 390).

## Qué es demo o mock (NO real todavía)

- **Texto del lector:** escrito para el demo, **no es de ningún libro ni autor**. Está etiquetado como "Texto de demostración". Se cambia cuando la editorial entregue el Word (Hito 2).
- **Marca de agua:** con datos de muestra (`lector@ejemplo.com`, `ID HR-DEMO`). Con login usará los datos reales del lector.
- **"Leer muestra"** en cualquier libro abre el mismo lector de demostración.
- **"Comprar"** está deshabilitado ("disponible pronto"). **"Mi biblioteca"** no funciona.
- **Catálogo:** datos locales en `src/lib/catalog/data.ts`; Supabase llega en el Hito 2.
- **Insignia "Demo"** visible en el encabezado.

## Por confirmar con la editorial

- **Precio digital** de cada libro (hoy dice "Precio por confirmar").
- **ISBN digital** de cada libro.
- **Word** de al menos un capítulo (de preferencia _Nahual_) para la muestra real.
- **Porcentaje de regalías** por autor y autorización de distribución digital.
- **Disponibilidad de Stripe Connect** en México (preguntar a Stripe) y retenciones fiscales (contador).

## Bloqueos y siguientes pasos

1. **Deploy (pospuesto por el dueño):** cuando se autorice, crear el proyecto en Vercel conectado al repo y agregar el CNAME `reads` en Neubox, **sin tocar los MX de Zoho ni los nameservers**.
2. **CI:** confirmar en GitHub Actions que el workflow `CI` pasa con el primer push.
3. Revisión del demo con el cliente → ajustes de diseño.

## Riesgos conocidos

- **`npm audit`:** 4 alertas "high" en una sola cadena (`braces` → `micromatch` → `fast-glob` → `@solidjs/start`). Se usan **solo al compilar** para descubrir rutas; no procesan entradas de usuarios. Npm solo propone bajar a SolidStart 1.x, así que **se acepta el riesgo** y se revisa en cada actualización de SolidStart.
- **Nitro v3 en beta** (ADR 0002).

## Enlaces

- **Repositorio (privado):** https://github.com/2-Erick-2/huapango-reads

- **Diseño (Claude Design):** https://claude.ai/artifact/CpdQ77dtym3sgLXDPW852m
- **Landing de la editorial:** https://www.editorialhuapango.com.mx
- **Prototipo anterior** (React, solo de referencia, NO se usa): carpeta local `~/Desktop/huapangoread`
