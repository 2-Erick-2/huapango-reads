# 0018 — Editor de la editorial: ProseMirror sobre el formato canónico, y panel solo local por ahora

- **Fecha:** 2026-11-24
- **Estado:** Aceptada (primer corte del panel; ver `docs/analisis/2026-11-24-panel-editorial.md`)
- **Decide:** Erick, con recomendación técnica

## Contexto

El plan del panel de la editorial (fases A a F) pedía un _spike_ de ProseMirror antes de diseñar el editor, porque de esa decisión depende su forma. Se quería empezar por el editor ("empezar con el editor y con eso"), pero todavía no hay cuentas, roles ni base de datos (Supabase es del Hito 2).

## Decisión

**1. ProseMirror, con el formato canónico como esquema** (`src/lib/editor/schema.ts`): cada bloque de la `Pieza` es un nodo (`heading`, `paragraph`, `byline`, `ornament`, `spacer`, `image`) y el texto en línea usa tres marcas (`strong`, `em`, `smallCaps`). Lo que se edita es exactamente lo que el lector pinta; no hay una segunda representación del libro.

**2. Conversión de ida y vuelta exacta** (`src/lib/editor/convert.ts`), con estas reglas:

- Los ids se renumeran de forma posicional (`<slug>-<n>`) y la huella se recalcula del texto.
- Los atributos que el editor no muestra (página del impreso, recorte de una imagen, crédito de una firma) viven en el nodo y sobreviven a la edición.
- Los saltos de página del impreso dentro de un párrafo solo se conservan si el texto de ese párrafo no cambió (si cambió, ya no se sabe dónde caían).
- El texto en línea se normaliza (fragmentos vecinos con el mismo formato se unen) y las marcas se anidan siempre igual: negrita > cursiva > versalitas.

**3. La condición de aceptación es una prueba, no una impresión:** `src/lib/editor/editor.test.ts` exige que **cada una de las 8 piezas reales** (_El príncipe feliz_ y _Nahual_) salga idéntica tras pasar al editor y volver, sobreviva a serializarse a JSON y siga pasando `validatePieza`. También cubre edición (escribir, cursiva, pérdida de marcas de página).

**4. Revisión en vivo:** el editor corre `validatePieza` (las mismas reglas del importador) mientras se escribe y muestra errores y avisos; guarda un **borrador en el navegador** (`localStorage`, por pieza) y permite **descargar** la pieza resultante. No hay versiones ni guardado en servidor todavía (tabla `versiones` en Supabase, Fase A).

**5. Panel solo local:** `/panel` y `/panel/<obra>/<pieza>` solo funcionan en desarrollo o si se compila con `VITE_PANEL=true` (`src/lib/panel.ts`). En cualquier otro build responden **404** (verificado con el build público). El panel no tiene cuentas ni permisos: **no debe publicarse** hasta tener Auth y RLS.

## Alternativas consideradas

- **Tiptap:** envuelve ProseMirror con más comodidades, pero añade una capa y un modelo de extensiones propio; para un esquema que ya es el formato canónico, ProseMirror directo es más simple y más predecible. Se puede adoptar después si hace falta.
- **Lexical / Slate / contenteditable propio:** menos probados para texto largo con esquema estricto y para colaboración futura.
- **Editar el JSON a mano:** no es una herramienta para una editorial.
- **Esperar a Supabase para empezar:** retrasa justo lo más incierto del plan; el spike no necesita backend.

## Consecuencias

- **Se de-riesgó lo más difícil del editor** (que el modelo del editor y el del lector sean el mismo) antes de dibujar sus pantallas finales.
- **Límites conocidos del primer corte:** no se editan los atributos de las imágenes (alt, recorte), el crédito de las firmas ni los metadatos de la pieza; no hay notas al pie, buscar y reemplazar, comentarios ni historial de versiones; el corrector es el del navegador; la colaboración simultánea no existe.
- **Dependencias nuevas** (versión exacta, de ejecución): `prosemirror-model` 1.25.13, `-state` 1.4.4, `-view` 1.43.1, `-commands` 1.7.2, `-keymap` 1.2.3, `-history` 1.5.2.
- **Sin autenticación:** cualquiera con acceso a un build con `VITE_PANEL=true` puede abrir el panel. Es aceptable solo en una máquina local.
- **Siguiente:** pantalla "Importar y revisar", metadatos de la obra, y llevar borrador y versiones a Supabase.
