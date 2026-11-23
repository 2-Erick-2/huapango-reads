# Opinión técnica: ¿un editor "tipo InDesign" dentro de +reads? (2026-11-23)

> **Contexto:** Erick les comentó a los dueños de Editorial Huapango que podía desarrollar, dentro de su plataforma, un editor como InDesign para crear sus libros, exportarlos y usarlos en +reads, y así dejar de pagar Adobe. Aquí está el análisis. La decisión propuesta está en el [ADR 0011](../decisiones/0011-alcance-del-editor-editorial.md).
> **Estado: SUPERADO.** Erick decidió construir el taller completo con PDF de imprenta. El prototipo mostró que el motor ya existe (Typst + Ghostscript). Ver [`2026-11-23-taller-editorial-completo.md`](2026-11-23-taller-editorial-completo.md) y el ADR 0013. Se conserva como historial.

## Resumen en una línea

**Un clon de InDesign, no. Un "taller editorial" para libros de texto corrido, sí, y además es lo que +reads necesita de todos modos.**

## Por qué un clon de InDesign no es viable

InDesign tiene más de 25 años y cientos de ingenieros detrás. Lo que la editorial usa de él para imprimir es justo lo más difícil de construir:

| Necesidad de imprenta                                        | Qué implica construirla                                                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Composición de párrafo de calidad (sin ríos, buen espaciado) | Algoritmo Knuth-Plass, división silábica en español, _kerning_, ligaduras y rasgos OpenType                          |
| PDF para imprenta (PDF/X-1a o X-4)                           | Color CMYK, perfiles ICC, sangrado, marcas de corte, tintas planas, fuentes incrustadas y validación con _preflight_ |
| Maqueta libre                                                | Marcos, capas, rotaciones, ceñido de texto a imágenes, páginas maestras, folios y cornisas automáticas               |
| Notas al pie, índices, referencias cruzadas                  | Cada una es un proyecto en sí misma                                                                                  |
| Edición de imágenes y portadas                               | Otro producto entero (Photoshop o Illustrator)                                                                       |
| Abrir sus `.indd` actuales                                   | Formato cerrado; no es realista                                                                                      |

- **Costo:** con una sola persona son años, no meses, y nunca llegaría al nivel de lo que ya usan.
- **Riesgo real:** un error de composición en un PDF de imprenta cuesta un tiraje completo, y la responsabilidad sería del desarrollador.
- **Distracción:** +reads todavía no está en producción (no tiene login, pagos ni contenido real). Abrir un segundo producto enorme antes de lanzar el primero es la forma más común de que ninguno salga.

## Si el objetivo es "no pagar Adobe", hay salidas más baratas hoy

Hay que verificar precios y licencias vigentes antes de recomendarlos al cliente:

- **Affinity (Publisher, Designer y Photo):** maquetación profesional con PDF/X y exportación a EPUB limitada. Según lo último que sé, Canva lo volvió gratuito a fines de 2025. **Confirmar.**
- **Scribus:** libre y gratuito, con PDF/X. Más tosco, pero funciona para imprenta.
- **Vellum** (Mac, pago único) o **Atticus** (web, pago único): hechos para novelas y cuentos. Sacan PDF de impresión y EPUB limpios con plantillas bonitas, sin maquetar a mano. Encajan muy bien con el catálogo de Huapango (narrativa).
- **Cadena de código abierto** (Pandoc + Paged.js, Vivliostyle o Typst): PDF de imprenta desde HTML o Markdown con plantillas. Es la base técnica de la propuesta de abajo.

## Lo que sí recomiendo: "Taller editorial" de +reads

Un **editor estructurado** (no de maqueta libre) dentro del panel de la editorial. El contenido se escribe o se importa **una sola vez** y la plataforma genera las salidas.

```
Word / EPUB de InDesign / texto nuevo
        │  importar (misma ingesta del ADR 0010)
        ▼
Editor estructurado: capítulos, títulos, párrafos, cursivas, epígrafes, notas, imágenes, portadillas
        │  formato canónico (JSON de bloques, ADR 0010)
        ├─► Lector +reads (lo primero y lo que paga el proyecto)
        ├─► EPUB 3 válido (Kindle, Apple y Google, si se quiere)
        └─► PDF de imprenta con plantilla por colección (Paged.js, Vivliostyle o Typst)  ← fase posterior y opcional
```

- **Editor:** ProseMirror (o el núcleo de Tiptap, que no depende de React) con un esquema fijo que coincide con los bloques del lector. Nada de marcos libres: el diseño lo ponen las **plantillas por colección** (Raíces, Cuentos a todas partes, ECOS, Gabinete Gótico y Tinta blanca). Así cada libro queda consistente con su colección.
- **Qué resuelve de verdad:**
  - La editorial deja de depender de "cómo exportó InDesign" (todos los problemas del [análisis de los EPUB](2026-11-23-epub-el-principe-feliz.md)).
  - Las correcciones de erratas se publican al instante en el lector.
  - El EPUB sale válido siempre.
  - Un solo archivo maestro por libro.
- **Qué no resuelve:**
  - Libros ilustrados con maqueta libre, portadas y material de marketing. Para eso siguen necesitando una herramienta de diseño, pero puede ser la gratuita (Affinity o Scribus), no Adobe.
  - El PDF de imprenta, que queda como fase opcional.
- **Ahorro realista:** quitarían InDesign de su flujo de narrativa (casi todo su catálogo) y usarían una alternativa gratuita para portadas e ilustrados.

## Fases sugeridas (después de lanzar +reads)

1. **Ya (Hito 2, se necesita igual):** ingesta Word/EPUB → formato canónico + vista previa (ADR 0010). Es la base de todo lo demás.
2. **Taller v1:** editor estructurado para corregir y editar libros ya importados, con publicación directa al lector.
3. **Taller v2:** exportar EPUB 3 válido con metadatos completos.
4. **Taller v3 (opcional, a cotizar aparte):** PDF de imprenta con plantillas por colección. Se valida con su imprenta real antes de prometerlo.

## Recomendación para la conversación con el cliente

- Reencuadrar la promesa: **"no es un InDesign; es una herramienta para producir sus libros de narrativa una sola vez y publicarlos en digital (y después en impreso) sin depender de Adobe para eso"**.
- **Cotizarlo como proyecto aparte** de +reads, con su alcance por fases. Así no se vuelve trabajo gratis dentro del contrato del lector.
- Mientras tanto, pedirles que exporten siguiendo la [guía de exportación](../editorial/guia-exportar-epub-desde-indesign.md). Es el cambio más barato y mejora ya la calidad.
- **Primero lanzar +reads** (Hitos 2 y 3). El taller se apoya en ese trabajo y no compite con él.
