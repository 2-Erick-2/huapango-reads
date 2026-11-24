# 0014 — Salida de imprenta: PDF compatible con su flujo actual y PDF/X como opción

- **Fecha:** 2026-11-24
- **Estado:** Aceptada (recomendación técnica, basada en el PDF real que usaron para imprimir)
- **Decide:** Erick, con recomendación técnica

## Contexto

El ADR 0013 suponía que la imprenta pediría PDF/X. El PDF con el que imprimieron _El príncipe feliz_ (análisis: `docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md`) no lo es. Es un PDF 1.4 de InDesign sin perfil de salida, con imágenes RGB, transparencias y sin sangrado, y lo aceptaron. El colofón indica que imprimen en su propio taller.

## Decisión

- El taller exporta por omisión un **PDF "compatible"**:
  - Texto en 100 % K y fuentes incrustadas.
  - Imágenes convertidas a CMYK con un perfil elegido.
  - Sangrado de 3 mm cuando hay imágenes al borde.
  - Total de páginas ajustado al pliego.
- **PDF/X** (X-3 probado; X-1a o X-4 según la imprenta) es una **opción de exportación** para imprentas externas.
- Las plantillas reproducen su diseño actual (medidas del análisis). Las mejoras que cambian el aspecto, como **activar la división de palabras**, se ofrecen como parámetro y se deciden con la editorial.
- El **preflight** (fuentes, ppp, CMYK, sangrado, tinta, múltiplos de página) corre en ambas salidas.

## Alternativas consideradas

- **Solo PDF/X:** más estricto, pero no hace falta para su imprenta actual. Agrega un paso que hoy nadie pide.
- **Copiar tal cual su PDF (RGB, sin sangrado):** funciona, pero hereda los riesgos: color que depende de la imprenta, filo blanco y logo en 4 tintas.

## Consecuencias

- La Fase 0 ya no se bloquea esperando el PDF/X. Falta confirmar el equipo de impresión, el papel y el calibre.
- El servicio de impresión ofrece dos perfiles de salida ("Compatible" y "PDF/X").
- Si cambian a una imprenta externa, solo se cambia el perfil de salida.
