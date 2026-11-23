# Guía para la editorial: cómo exportar el EPUB desde InDesign para +reads

> Para el equipo de Editorial Huapango. Seguirla hace que el libro entre a +reads casi sin correcciones y se vea bien en celular, tableta y computadora. Origen: el análisis de los EPUB de _El príncipe feliz_ ([`docs/analisis/2026-11-23-epub-el-principe-feliz.md`](../analisis/2026-11-23-epub-el-principe-feliz.md)).

## Lo más importante (si solo hacen 5 cosas)

1. **Un solo EPUB por libro**, con todo en orden: portadilla, prólogo, nota, texto y colofón. No en archivos separados.
2. **Estilos de párrafo con nombre**, nunca formato a mano. Por ejemplo: `Titulo capitulo`, `Firma`, `Texto`, `Texto sin sangria`, `Epigrafe`, `Fin`.
3. **La portada como imagen propia** (JPG de al menos 1600 px de alto), no "rasterizar la primera página".
4. **Fuentes libres** (por ejemplo Libertinus, Tangerine, Newsreader o EB Garamond). No Times New Roman, Monotype Corsiva, Microsoft Himalaya ni Minion Pro: son de pago y no se pueden incluir en un libro digital sin licencia.
5. **Quitar lo que solo sirve en papel:** "Impreso en…", listas de "Próximos lanzamientos" y páginas en blanco. +reads pone esa información automáticamente y siempre actualizada.

## Configuración de los estilos (una sola vez por plantilla de colección)

En **Opciones de estilo de párrafo → Etiquetas de exportación**, asignen la etiqueta HTML:

| Estilo                                                        | Etiqueta     | Clase           |
| ------------------------------------------------------------- | ------------ | --------------- |
| Título del libro / portadilla                                 | `h1`         | `titulo`        |
| Título de capítulo / sección (Prólogo, Nota de la traductora) | `h2`         | `capitulo`      |
| Firma ("Por Mercedes Varela")                                 | `p`          | `firma`         |
| Texto con sangría                                             | `p`          | `texto`         |
| Primer párrafo (sin sangría, con capitular)                   | `p`          | `texto-inicial` |
| Epígrafe / cita                                               | `blockquote` | `epigrafe`      |
| "FIN" / separadores                                           | `p`          | `ornamento`     |

- La **capitular** se aplica en el estilo `texto-inicial`. +reads la vuelve a dibujar para que crezca con el tamaño de letra del lector.
- **Cursivas y negritas** con estilos de carácter (`Cursiva`, `Negrita`), no con el botón.
- **No usar párrafos vacíos** para dar espacio. Usar "Espacio antes/después" en el estilo.
- **Diálogos** con raya (—), como ya lo hacen. Bien.

## Imágenes

- **Ilustraciones de fondo** (como las golondrinas): exportarlas como imagen independiente, en buena resolución, y **sin el texto encima**. +reads arma la portadilla con el título sobre la ilustración en cualquier pantalla.
- **Texto alternativo:** en **Opciones de exportación de objetos → Texto alternativo**, una frase que describa la imagen ("Golondrinas en vuelo sobre fondo blanco"). Si es puro adorno, márquenla como decorativa.
- **Formato:** JPG para ilustraciones con color y PNG solo para logos o imágenes con transparencia.

## Al exportar (Archivo → Exportar → EPUB reajustable)

- **General:**
  - Versión **EPUB 3.0**.
  - Portada: **Seleccionar imagen** (no "Rasterizar la primera página").
  - Orden: **Igual que el diseño de página** (o el panel Artículos, si lo usan).
  - Navegación: Tabla de contenido desde los estilos `h1`/`h2`.
- **Texto:** pueden conservar la lista de páginas del impreso (sirve para citar). +reads la guarda invisible.
- **Objeto:** CSS relativo al diseño desactivado. Que las imágenes no tengan tamaños fijos en px.
- **Metadatos:**
  - Título con mayúsculas normales ("El príncipe feliz").
  - Autor (Oscar Wilde) y traducción (nombre exacto).
  - Editorial "Editorial Huapango".
  - **ISBN digital** como identificador.
  - Idioma español.
- **CSS:** no incluir colores de texto fijos (el negro hace que el texto desaparezca en modo oscuro).

## Qué mandar junto con el EPUB

- El EPUB único del libro.
- La **portada** en JPG de alta resolución.
- Los **datos del libro**:
  - Título y subtítulo.
  - Autor.
  - Traductor/a.
  - Prologuista.
  - Ilustrador/a.
  - ISBN digital.
  - Precio digital.
  - Colección.
- **Autorización de distribución digital** de quien tenga derechos sobre el texto, la traducción, el prólogo y las ilustraciones.
- Si tienen el **Word** final, también. Sirve de respaldo para la conversión.

## Dudas pendientes de _El príncipe feliz_

- ¿La traducción es de **Yarely Campos** (como dice el EPUB) o de **Isabel Campos** (como dice nuestro catálogo)?
- ¿Quién hizo las ilustraciones de golondrinas (archivos "NEKO")? ¿Tenemos su permiso para la edición digital?
- ¿La dirección correcta es Elías Piña #100 o Calle Novena #225?
- ¿El prólogo de Mercedes Varela entra completo en la versión digital?
