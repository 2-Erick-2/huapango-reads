# Guía de ingesta de contenido

> Cómo entra un libro nuevo a +reads: de los EPUB de InDesign al formato canónico y al lector. Decisiones y porqués: [ADR 0016](decisiones/0016-formato-canonico-v1-e-importador-en-node.md) y [ADR 0010](decisiones/0010-ingesta-epub-a-formato-canonico.md). Requiere Node 24 (`nvm use`) y `npm install`.

## El flujo en 5 pasos

```
EPUB(s) ─► 1. inspeccionar ─► 2. escribir mapeo.json ─► 3. importar y verificar ─► 4. revisar informe ─► 5. publicar
```

1. **Poner los archivos** en `contenido-privado/<obra>/epub/` (el slug de la obra en minúsculas con guiones, igual al del catálogo).
2. **Inspeccionar** cada EPUB para ver su estructura real:
   ```bash
   npm run contenido:inspeccionar -- "contenido-privado/<obra>/epub/LIBRO.epub"            # clases, imágenes
   npm run contenido:inspeccionar -- "contenido-privado/<obra>/epub/LIBRO.epub" --bloques  # cada párrafo con su página
   ```
   Sirve para ver qué clase es título, firma o cuerpo, en qué orden vienen las imágenes y dónde empieza y termina cada texto.
3. **Escribir `contenido-privado/<obra>/mapeo.json`** (ver más abajo; hay dos ejemplos reales: `nahual` y `el-principe-feliz`).
4. **Importar y verificar** (no escribe nada si hay errores):
   ```bash
   npm run contenido:importar -- contenido-privado/<obra>/mapeo.json --sin-escribir   # prueba
   npm run contenido:importar -- contenido-privado/<obra>/mapeo.json                   # escribe canonico/
   ```
5. **Publicar para la app** (importa y verifica TODAS las obras y actualiza `public/contenido/` y el manifiesto):
   ```bash
   npm run contenido:publicar
   ```
   Después, agregar el libro a `src/lib/catalog/data.ts` con `read: { obra, slug }`, correr `npm run check` y `npm run e2e:humo`.

## Qué produce

`contenido-privado/<obra>/canonico/` (auditable, se reescribe en cada importación):

| Archivo         | Qué es                                                                |
| --------------- | --------------------------------------------------------------------- |
| `<pieza>.json`  | La pieza en formato canónico (bloques tipados).                       |
| `manifest.json` | Lista de piezas en orden de lectura, con tipo, firma y estadísticas.  |
| `assets/`       | Imágenes con huella en el nombre (`3257d0e9-vi-etas-nahual-8.png`).   |
| `informe.md`    | Piezas, verificación, imágenes y avisos. **Léelo antes de publicar.** |

Y `npm run contenido:publicar` copia lo que usa el lector a `public/contenido/<obra>/` y genera `src/lib/contenido/manifests.generated.ts`. **No se editan a mano.**

## El mapeo (`mapeo.json`)

```jsonc
{
  "obra": "mi-libro", // slug; igual al del catálogo
  "nota": "…", // texto libre para quien lo lea después
  "fuentes": [
    // un objeto por cada EPUB (cada uno renombra sus clases)
    {
      "archivo": "epub/MI_LIBRO.epub", // relativo al mapeo
      "contrastes": [
        // otras exportaciones: su texto debe coincidir (advertencia si no)
        { "archivo": "epub/OTRA.epub" }, // contra todo el documento
        { "archivo": "epub/SOLO_CUENTO.epub", "piezas": ["mi-libro"] }, // o contra solo algunas piezas
      ],
      "clases": { "ParaOverride-1": "titulo1", "ParaOverride-6": "ignorar" }, // rol por clase CSS
      "textos": { "FIN": "ornamento", "Por Ana": "firma" }, // rol por texto exacto (manda sobre clases)
      "imagenes": {
        // TODA imagen del EPUB debe tener un rol
        "image/logo.png": { "rol": "ignorar" },
        "image/titulo.jpg": { "rol": "titulo", "texto": "Prólogo" },
        "image/cap1.png": { "rol": "capitulo", "texto": "Jornalero" }, // opcional: "recorte": { "desde": 0.04, "hasta": 0.44 }
        "image/vineta.png": { "rol": "ilustracion", "alt": "Un perro" }, // sin "alt" = decorativa
        "image/adorno.png": { "rol": "divisor" },
      },
      "piezas": [
        {
          "slug": "mi-libro-prologo",
          "tipo": "complemento",
          "titulo": "Prólogo",
          "desde": "Conozco al autor", // el bloque que EMPIEZA con este texto (debe ser único)
          "hasta": "Ángelus", // el bloque que EMPIEZA con este texto, incluido
          "portadilla": "image/titulo.jpg", // imagen "titulo": se vuelve un encabezado real
          "capitular": false,
          "colocar": [{ "imagen": "image/vineta.png", "antes": "Conozco al autor" }], // antes | despues | alInicio | alFinal
        },
        { "slug": "mi-libro", "tipo": "libro", "titulo": "Mi libro", "desde": "…", "hasta": "…" },
      ],
    },
  ],
}
```

**Roles de clase y de texto:** `titulo1`, `titulo2`, `parrafo`, `firma`, `ignorar` (y `ornamento` solo por texto). Lo que no se declara se decide solo: etiqueta `h1`–`h3` = título; texto corto alineado a la derecha = firma; vacío = espacio; lo demás = párrafo. Dos líneas de firma seguidas se unen (nombre + crédito).

**Roles de imagen:**

| Rol                    | Qué hace                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `titulo`               | La imagen solo dice un título ("Prólogo"): se reemplaza por un encabezado de texto real (se usa como `portadilla` de la pieza). |
| `capitulo`             | Tarjeta de capítulo con el nombre horneado: se genera el adorno recortado + un título real. Va en `colocar`.                    |
| `portadilla`           | Arte a página completa de la apertura de una pieza.                                                                             |
| `ilustracion`          | Viñeta pequeña.                                                                                                                 |
| `divisor`, `ornamento` | Separadores y adornos.                                                                                                          |
| `ignorar`              | No se usa (logos de imprenta, imágenes sin permiso o procedencia confirmada…).                                                  |

**Reglas de las piezas:** son exhaustivas (todo texto cae en una pieza o se declara `ignorar`), van en orden de lectura y exactamente una es `libro`; los complementos quedan ligados a él. Los slugs llevan el prefijo de la obra (`nahual-prologo`) porque son únicos en toda la plataforma.

## El informe de verificación

Todo lo marcado como error detiene la importación. En `informe.md` y en la consola:

| Comprobación                                              | Qué demuestra                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Texto íntegro en `<archivo>.xhtml`                        | Contar palabras del XHTML quitando etiquetas coincide, en orden, con lo extraído. **Nada se perdió.**    |
| Todo el texto está en una pieza o declarado como ignorado | Ninguna palabra quedó huérfana.                                                                          |
| Las piezas cubren el flujo completo sin repetir ni omitir | El corte por anclas no dejó huecos ni duplicó nada.                                                      |
| Los bloques construidos conservan el texto de cada pieza  | Armar los bloques no cambió el texto.                                                                    |
| Ningún párrafo termina cortado a media frase              | Alarma contra el tipo de error que tenía el normalizador viejo.                                          |
| Toda imagen del libro está colocada en una pieza          | Ninguna imagen se perdió en silencio.                                                                    |
| Contraste: `<otro>.epub` vs …                             | (Advertencia) Las otras exportaciones dicen lo mismo. Si no, el informe muestra el tramo donde difieren. |

### Errores comunes

| Mensaje                                                     | Qué hacer                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `hay N imagen(es) sin rol en el mapeo`                      | Agrégalas a `imagenes` con su rol (lista en el mensaje).                                                      |
| `no hay ningún bloque que empiece con "…"`                  | El texto de `desde`/`hasta` no coincide; copia el principio exacto del párrafo (ojo con espacios y comillas). |
| `"…" es ambiguo, empieza N bloques`                         | Alarga el texto de `desde` hasta que sea único.                                                               |
| `Hay N bloque(s) de texto sin pieza …`                      | Ese texto no cae en ninguna pieza: ajusta `desde`/`hasta`, agrega una pieza o márcalo `ignorar`.              |
| `Termina sin puntuación final: "…"`                         | O el texto de origen está cortado, o es un caso legítimo (revisa el EPUB).                                    |
| `XML mal formado en …`                                      | El XHTML está dañado; pide a la editorial que exporte de nuevo.                                               |
| `Ruta insegura / CRC incorrecto / Entrada demasiado grande` | El archivo está dañado o no es un EPUB confiable. No se procesa.                                              |

## Portadas

Las portadas del catálogo son `public/books/portada-<slug>.jpg`, `.webp` y `-260.webp` (500 × 720 y 260 × 374 px, proporción 25:36). Para generarlas desde lo que entrega la editorial (ADR 0017; funciona con el navegador instalado, sin descargar nada):

```bash
# Si la portada viene dentro de un PDF (p. ej. una cubierta extendida de Canva):
npm i --no-save pdfjs-dist
npm run assets:pdf -- "ruta/forros.pdf" "ruta/salida/forros" 4       # → forros-1.png a escala 4

# Recortar y exportar: crea un archivo spec.json
# [{ "slug": "mi-libro", "src": "ruta/salida/forros-1.png", "modo": "panel-derecho", "sesgoSuperior": 0.25 },
#  { "slug": "otro",     "src": "ruta/otra.jpg",            "modo": "bbox" }]
npm run assets:portadas -- ruta/salida/covers spec.json
# Copia los archivos a public/books/ y revisa el resultado a ojo.
```

## Qué NO hace todavía

- **No importa Word (`.docx`)** ni EPUB de terceros sin pasar por un mapeo. Está previsto (ADR 0010).
- **No maneja notas al pie, tablas ni listas** (avisa con `etiqueta-no-soportada`).
- **No valida con EPUBCheck** el EPUB de origen (pendiente; ver `ROADMAP.md`).
- **Obras escritas en el panel** (libros y ensayos nuevos) llegan como `contenido-privado/<obra>/paquete.json` y se publican con el mismo `npm run contenido:publicar` (ADR 0019). No llevan imágenes todavía.
- **No hay interfaz**: todo es por línea de comandos y un archivo JSON. El panel de la editorial ([plan](analisis/2026-11-24-panel-editorial.md)) lo envolverá.
- Las imágenes se copian tal cual; la conversión a WebP con `srcset` es una tarea pendiente del Hito 2.

## Cómo se prueba

`npm test` cubre el formato, la validación, el ZIP seguro, la extracción (incluida la regresión de las marcas de página), los roles, los cortes, el mapeo, el verificador y la importación de punta a punta con un EPUB sintético (`scripts/ingesta/testing/epub-builder.ts`) y con los dos libros reales. Las pruebas del contenido ya publicado en `public/contenido/` corren también en CI. `npm run e2e:humo` abre la app en un navegador real (escritorio y celular) y comprueba la lectura de punta a punta.
