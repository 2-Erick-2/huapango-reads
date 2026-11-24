# Modo día con la paleta de la landing, y exportar el PDF de imprenta (2026-11-24)

Pedido de Erick:

- **Modo día:** al dueño le encantó la paleta de la landing (`2-Erick-2/editorialhuapangolanding`) y la quiere en +reads como **modo día**, conservando el actual como **modo noche**.
- **PDF de imprenta:** saber si el panel ya exporta el PDF con el que la editorial imprime.

## 1. Análisis de la landing

Fuente: `tailwind.config.js`, `src/styles/main.css` e `index.html` (Tailwind 3, 1334 líneas), clonados en `../editorialhuapangolanding/`.

**Paleta.** Es la misma que ya tiene +reads (ADR 0004: bond, carbón, terregal y ocre, con los mismos valores). La diferencia **no está en los colores, sino en cómo se usan**: la landing es **clara**, sobre papel; +reads es oscura.

| Uso en la landing                         | Clase (veces)                                                                | Valor                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| Fondo de página                           | `bg-bond-100` (16)                                                           | #FDFBF7, "papel bond crema 70 g"                        |
| Secciones alternas                        | `bg-bond-50` (7), `bg-bond-200/50`                                           | #FFFEFA, #F5EFE6                                        |
| **Textura de papel** (hero, catálogo)     | `.paper-texture`                                                             | puntos #D3C7B5 de 0.75 px cada 24 px sobre #FDFBF7      |
| Títulos y texto fuerte                    | `text-carbon-900` (46), `text-carbon-800` (16)                               | #141413, #232321                                        |
| Texto secundario                          | `text-carbon-600` (25), `text-carbon-700`                                    | #5A5953, #3A3935                                        |
| **Acento** (enlaces, etiquetas, cifras)   | `text-terregal-600` (73, la clase más usada)                                 | #A3452B                                                 |
| Botón principal                           | `bg-terregal-600` + blanco, hover `terregal-700`                             | #A3452B / #7E341F                                       |
| Líneas y bordes                           | `border-bond-300` (27), `border-bond-200`                                    | #EADFCF, #F5EFE6                                        |
| Foco                                      | `ring-terregal-500` (14)                                                     | #C05A3E                                                 |
| Encabezado fijo                           | `bg-bond-100/95` + desenfoque, borde `bond-300/60`                           |                                                         |
| **Bandas oscuras** (sección +reads y pie) | `bg-carbon-900 text-bond-100`; el pie lleva `border-t-4 border-terregal-600` | la firma visual: el claro se "cierra" con carbón y teja |
| Sombras de libro                          | cálidas y suaves                                                             | `rgba(20,20,19,.28)` y `rgba(163,69,43,.22)` al pasar   |
| Logo                                      | `logo-editorial-huapango.svg` (oscuro) en claro; `-claro.svg` en el pie      |                                                         |
| Tipografía                                | Newsreader y Plus Jakarta Sans (igual que +reads)                            |                                                         |

**Contraste medido sobre `bond-100`** (WCAG AA: 4.5 texto normal, 3 texto grande y controles):

| Color de texto | Contraste | Uso en modo día                                                      |
| -------------- | --------: | -------------------------------------------------------------------- |
| carbon-900     |     17.84 | texto principal                                                      |
| carbon-700     |     11.19 | texto fuerte secundario                                              |
| carbon-600     |      6.80 | texto secundario                                                     |
| carbon-500     |      4.61 | texto tenue, **solo** sobre bond-100 (sobre bond-200 da 4.16)        |
| carbon-400     |      3.22 | **no sirve para texto**; solo bordes de campos (≥ 3:1)               |
| terregal-600   |      5.90 | acento en texto (lo que hace la landing)                             |
| terregal-500   |      4.26 | **no** para texto chico; solo foco y elementos grandes               |
| blanco / teja  |      6.10 | botón principal (`terregal-600`)                                     |
| ochre-600      |      4.27 | **corto** para avisos: hace falta un ocre un tono más oscuro (≥ 4.5) |

## 2. Estado de +reads

- **~650 clases de color en 24 archivos**, escritas para fondo oscuro (`text-bond-100` ×67, `text-carbon-300` ×60, `text-terregal-400` ×42, `bg-carbon-900` ×20…). Hay además 11 colores fijos en TypeScript (temas del lector y de impresión).
- El lector tiene sus **propios temas de página** (papel, sepia, noche) y se conservan.
- Solo existe el logo claro (`public/brand/*-claro.svg`).

**Conclusión:** cambiar valores no basta. Lo correcto es pasar a **colores con significado** (fondo, superficie, tinta, línea, acento, aviso) que cambian según el modo. Así cada pantalla funciona en los dos modos sin duplicar código.

## 3. Plan del modo día / modo noche

**Fase 1 — Tokens con significado** (`src/styles/app.css`, Tailwind 4 `@theme inline` sobre variables CSS):

| Token                                 | Noche (actual)        | Día (landing)                                        |
| ------------------------------------- | --------------------- | ---------------------------------------------------- |
| `fondo`                               | carbon-900            | bond-100 (+ textura de papel en portadas de sección) |
| `fondo-hondo` (barras)                | carbon-950            | bond-50                                              |
| `superficie` (tarjetas)               | carbon-850            | bond-50 / blanco cálido                              |
| `superficie-2`                        | carbon-800            | bond-200                                             |
| `control` (fondo de botón secundario) | carbon-700            | bond-200                                             |
| `linea`                               | carbon-800            | bond-300                                             |
| `linea-fuerte`                        | carbon-700            | bond-400                                             |
| `borde-campo` (≥ 3:1)                 | carbon-600            | carbon-400                                           |
| `tinta`                               | bond-100              | carbon-900                                           |
| `tinta-2`                             | bond-300              | carbon-700                                           |
| `tinta-suave`                         | carbon-300            | carbon-600                                           |
| `tinta-tenue`                         | carbon-400            | carbon-500                                           |
| `acento` (texto)                      | terregal-400          | terregal-600                                         |
| `acento-fondo` / hover                | terregal-600 / 700    | terregal-600 / 700 (igual)                           |
| `aviso`                               | ochre-300 / ochre-600 | ocre nuevo, más oscuro (≥ 4.5:1)                     |
| sombras de libro                      | negras, profundas     | las cálidas de la landing                            |

Además: `color-scheme`, selección y foco (`terregal-600` en día), y la clase `.textura-papel` de la landing, activa solo en día.

**Fase 2 — Migrar las pantallas.**

- Un script de reemplazo con una tabla fija (`bg-carbon-900` → `bg-fondo`, `text-bond-100` → `text-tinta`…), aplicado y revisado archivo por archivo.
- Las excepciones se marcan a propósito con tokens "siempre oscuro":
  - insignias sobre portadas (los "14 min");
  - sombras del lector;
  - el papel de la vista de impresión;
  - las **bandas oscuras** al estilo de la landing: el pie con su línea teja y, si gusta, la franja de "Ensayos" o del "Club de lectura".
- Una **prueba de guardia** falla si alguien vuelve a escribir colores crudos fuera de esas excepciones.

**Fase 3 — Selector de modo** en el encabezado del sitio, del lector y del panel: sol / luna, con "Automático" (el del teléfono o computadora).

- Se recuerda en el navegador.
- Un script mínimo en el `<head>` aplica el modo **antes de pintar**, para que no haya parpadeo de oscuro a claro.
- `theme-color` del navegador por modo.

**Fase 4 — Lector.** El marco del lector (barras, índice, ajustes) sigue el modo del sitio. La página conserva sus temas de lectura; la primera vez se elige el que corresponde al modo (día → papel, noche → noche) y después manda la elección del lector.

**Fase 5 — Marca.** Logo oscuro para el modo día, igual que el de la landing (`logo-editorial-huapango.svg`). Se deriva del claro cambiando sus rellenos, y se compara con el de la landing.

**Fase 6 — Verificación.**

- Prueba automática de **contraste de todos los pares** de tokens en ambos modos: texto ≥ 4.5 y controles ≥ 3.
- `e2e:humo` y `e2e:panel` corren **en los dos modos**.
- Capturas de escritorio y celular de inicio, ficha, lector, panel e importar, en día y en noche.
- Lighthouse de accesibilidad en las dos versiones.

**Fase 7 — Documentación.** ADR 0022, `DISENO.md` y la referencia de diseño de la skill. En `AGENTS.md`, la regla "solo tokens con significado".

**Decisiones de Erick y el dueño:**

1. Modo por omisión: **Día** (lo que pidió el dueño) o **Automático**.
2. Bandas oscuras como la landing (pie y alguna franja), sí o no.
3. Textura de papel en las portadas de sección, sí o no.

## 4. PDF de imprenta: estado real

**Hoy el panel NO exporta un PDF listo para imprimir.** La pestaña "Impresión (media carta)" es una **vista aproximada** en pantalla.

Lo que sí existe es un **prototipo probado** (`prototipos/taller-impresion/`, ADR 0013–0015):

- La plantilla de interior "Cuentos a todas partes" en Typst, **calibrada contra el PDF real** de _El príncipe feliz_: Libertinus 14/18, márgenes 70/76 pt, cornisas, apertura impar, 5.5 × 8.5 in.
- La imposición en **folleto** (lo que hacen con "Folleto" de Acrobat).
- La portada extendida con lomo y EAN-13.
- El analizador de PDF de referencia.

Pero corre con Python y Typst a mano, fuera de la app, y aún lee el formato viejo (`libro.json`).

## 5. Plan del PDF de imprenta

1. **Spike: Typst sin binarios nativos.** En esta máquina los binarios nativos están bloqueados (ADR 0017). Compilar la plantilla desde Node con el compilador de Typst en WebAssembly. Criterio: mismas páginas, márgenes e interlineado que el prototipo calibrado.
2. **La plantilla lee el formato canónico v1** (piezas del panel), con títulos, firmas, capitular, imágenes (revisión de 300 ppp) y fuentes libres (OFL) incrustadas.
3. **Imposición en folleto en JavaScript** (pdf-lib): carta horizontal, 2 páginas por cara, completa a múltiplo de 4, _creep_ opcional. Es el mismo algoritmo de `imponer_folleto.py`, que ya está probado.
4. **En el panel, "Exportar para imprimir"** por obra:
   - **PDF media carta** (para imprimir con su flujo actual de Acrobat).
   - **Folleto listo** (ya impuesto, se imprime desde cualquier visor).
   - **Revisión previa:** páginas, múltiplo de 4, imágenes de baja resolución y fuentes incrustadas.
   - Se guarda cada exportación en Supabase (carpeta privada "impresion").
5. **Validación con la editorial:** comparación lado a lado con su PDF real y **una impresión de prueba física**.
6. **Después:** portada extendida (requiere ISBN y número final de páginas) y PDF/X en CMYK solo si imprimen fuera.

**Bloqueos:** modelo de impresora, papel y engrapado (para calibrar el _creep_), e ISBN de cada libro (para la portada). Ya están pedidos en `docs/editorial/solicitud-datos-imprenta.md`.
