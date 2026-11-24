# 0015 — Imposición en folleto desde el taller

- **Fecha:** 2026-11-24
- **Estado:** Aceptada
- **Decide:** Erick, con recomendación técnica

## Contexto

La editorial confirmó que imprime sus libros ella misma: manda el PDF media carta a la impresora con la opción **"Folleto" de Adobe Acrobat**, que acomoda 2 páginas por cara en hojas carta para doblar y engrapar. Análisis: `docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md` (sección 0).

## Decisión

- El taller exporta dos archivos de interior:
  1. **Páginas media carta** (para revisión, EPUB, archivo y otras imprentas).
  2. **Folleto impuesto en carta**, listo para imprimir a doble cara (volteo por el borde corto).
- La imposición la hace un paso propio (`prototipos/taller-impresion/imponer_folleto.py`, con pypdf):
  - Completa a múltiplo de 4 con blancas al final.
  - Ordena como Acrobat.
  - Tiene **compensación de creep** opcional.
- Se conserva la salida "compatible" del ADR 0014 como formato base. El sangrado y el PDF/X solo se activan para imprentas externas.

## Alternativas consideradas

- **Dejar la imposición a Acrobat:** funciona, pero ata el flujo a Adobe (justo lo que se quiere dejar) y no compensa el creep.
- **Imponer dentro de Typst:** posible, pero mezcla diseño y producción. Mejor como paso aparte sobre el PDF final.

## Consecuencias

- Pueden dejar Acrobat: el folleto impuesto se imprime desde cualquier visor.
- Hay que confirmar el modelo de impresora, el papel y si los forros van aparte, para calibrar el creep y la portada.
- Con impresora de oficina no se imprime al borde: las ilustraciones a sangre llevan margen blanco, salvo que cambien de equipo o refilen.
