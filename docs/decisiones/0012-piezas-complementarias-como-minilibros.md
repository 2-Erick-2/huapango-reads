# 0012 — Prólogo y nota de la traductora como "minilibros" ligados al libro

- **Fecha:** 2026-11-23
- **Estado:** Aceptada (lo indicó Erick; faltan detalles comerciales con la editorial)
- **Decide:** Erick / Editorial Huapango

## Contexto

De _El príncipe feliz_ llegaron 3 EPUB. Erick aclaró que **solo `EL_PRINCIPE_FELIZ_CONTENIDO.epub` es el libro**. El prólogo (Mercedes Varela) y la nota de la traductora son **contenido externo**. Se presentarán como **minilibros aparte**, no unidos al libro. El análisis inicial (`docs/analisis/2026-11-23-epub-el-principe-feliz.md`) proponía unirlos y se corrigió.

## Decisión

- El catálogo distingue dos tipos de obra:
  - `libro`.
  - `complemento` (minilibro): prólogo, nota de traducción, ensayo breve, etc.
- Cada complemento tiene su ficha, portada y lectura propias, y una **relación con el libro** (`parentSlug`). La ficha del libro los muestra ("Complementos: Prólogo de Mercedes Varela · Nota de la traductora").
- Pasan por la misma ingesta y el mismo formato canónico (ADR 0010) que los libros, cada uno como documento independiente.
- En el taller editorial (ADR 0013), la plantilla de impresión puede **incluirlos dentro del libro impreso** si la editorial lo decide. La fuente sigue siendo una sola por pieza.

## Por confirmar con la editorial

- ¿Los minilibros son **gratis**, se **venden aparte** o vienen **incluidos al comprar el libro**? Afecta el modelo de compras y el ledger de regalías (la prologuista y la traductora pueden tener derechos propios).
- ¿Llevan portada propia? Hoy cada uno trae una portadilla con golondrinas.

## Alternativas consideradas

- **Unir todo en un solo libro:** descartado por decisión del dueño.
- **Mostrarlos solo como texto en la ficha:** se pierde la experiencia de lectura y la medición de lectura.

## Consecuencias

- Hay que agregar `kind: "libro" | "complemento"` y `parentSlug` a `Book` (`src/lib/catalog/types.ts`) y a las tablas de Supabase en el Hito 2.
- La regla de compra y de regalías debe soportar piezas gratuitas o incluidas.
