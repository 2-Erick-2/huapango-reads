# Prototipo: motor de impresión del taller editorial (2026-11-23)

Prueba de concepto del [ADR 0013](../../docs/decisiones/0013-taller-editorial-completo-con-pdf-de-imprenta.md). **No es código de producción**: sirve para comprobar que la cadena "formato canónico → Typst → PDF → PDF/X en CMYK" funciona y es reproducible. El análisis completo está en [`docs/analisis/2026-11-23-taller-editorial-completo.md`](../../docs/analisis/2026-11-23-taller-editorial-completo.md).

## Qué hay aquí

| Archivo                      | Qué hace                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normalizar.py`              | XHTML de InDesign → `libro.json` (bloques canónicos). Tiene el **mapeo de clases de _El príncipe feliz_** (InDesign renombra las clases en cada exportación). Descarta párrafos vacíos, lanzamientos y colofón                                                                                              |
| `desofuscar_fuentes.py`      | Recupera las fuentes **libres** (Libertinus y Tangerine, OFL) que InDesign ofusca dentro del EPUB                                                                                                                                                                                                           |
| `coleccion-cuentos.typ`      | Plantilla de interior "Cuentos a todas partes", de 5.5 × 8.5 in. **Calibrada (2026-11-24)** contra el PDF real de imprenta: Libertinus 14/18, márgenes de 70/76 pt, sangría más línea en blanco, cornisas par/impar al 78 % K y apertura en página impar. Parámetros: `--input autor=… titulo=… guiones=si` |
| `analizar_pdf_referencia.py` | Analiza un PDF de imprenta de referencia (cajas, PDF/X, color, fuentes y licencias, imágenes y ppp, tipografía, márgenes, interlineado, ISBN, tinta/TAC). Uso: `.venv/bin/python analizar_pdf_referencia.py <pdf> --json reporte.json`. Requiere `pip install pdfplumber pillow`                            |
| `portada.typ`                | Portada extendida: contraportada + lomo calculado + portada, con sangrado de 3 mm, marcas de corte y código de barras EAN-13 propio                                                                                                                                                                         |
| `imponer_folleto.py`         | Imposición en **folleto** (lo que hace "Folleto" de Adobe Acrobat al imprimir): hojas carta horizontales con 2 páginas por cara, para doble cara, doblar y engrapar. Completa a múltiplo de 4 y tiene compensación de _creep_ opcional                                                                      |

Los archivos del libro (EPUB, PDF de imprenta, `libro.json`, fuentes OFL extraídas, ilustración y salidas) están en `contenido-privado/el-principe-feliz/` (ver su `README.md`).

## Guía rápida (desde la raíz del repo)

Requiere Python 3, Ghostscript (≥ 10) y `poppler-utils` (en Mac: `brew install ghostscript poppler`).

```bash
python3 -m venv prototipos/taller-impresion/.venv
```

```bash
prototipos/taller-impresion/.venv/bin/pip install typst==0.15.2 pdfplumber pillow pypdf
```

Interior y portada (la salida va a `contenido-privado/el-principe-feliz/taller/salidas/`):

```bash
L=contenido-privado/el-principe-feliz
prototipos/taller-impresion/.venv/bin/python -c "
import typst
typst.compile('prototipos/taller-impresion/coleccion-cuentos.typ', root='.', output='$L/taller/salidas/interior.pdf', font_paths=['$L/taller/fonts'], ignore_system_fonts=True, sys_inputs={'libro': '/$L/taller/libro.json', 'autor': 'Oscar Wilde', 'titulo': 'El príncipe feliz'})
typst.compile('prototipos/taller-impresion/portada.typ', root='.', output='$L/taller/salidas/portada.pdf', font_paths=['$L/taller/fonts'], ignore_system_fonts=True, sys_inputs={'paginas': '62', 'ilustracion': '/$L/taller/golondrinas.png'})
"
```

Folleto listo para imprimir (como lo hace la editorial con Acrobat):

```bash
prototipos/taller-impresion/.venv/bin/python prototipos/taller-impresion/imponer_folleto.py contenido-privado/el-principe-feliz/taller/salidas/interior.pdf contenido-privado/el-principe-feliz/taller/salidas/interior-folleto.pdf
```

Analizar un PDF de imprenta:

```bash
prototipos/taller-impresion/.venv/bin/python prototipos/taller-impresion/analizar_pdf_referencia.py contenido-privado/el-principe-feliz/imprenta/EL_PRINCIPE_FELIZ_22OCTUBRE2026.pdf --json /tmp/reporte.json
```

Regenerar `libro.json` y las fuentes desde el EPUB (solo si cambia el EPUB):

```bash
unzip -oq contenido-privado/el-principe-feliz/epub/EL_PRINCIPE_FELIZ_CONTENIDO.epub -d /tmp/epub-contenido
```

```bash
python3 prototipos/taller-impresion/desofuscar_fuentes.py /tmp/epub-contenido contenido-privado/el-principe-feliz/taller/fonts
```

```bash
python3 prototipos/taller-impresion/normalizar.py /tmp/epub-contenido/OEBPS/EL_PRINCIPE_FELIZ_NOTA_DE_LA_TRADUCTORA.xhtml contenido-privado/el-principe-feliz/taller/libro.json
```

Parámetros de las plantillas (`sys_inputs`):

- **Interior:** `libro`, `autor`, `titulo`, `guiones=si`.
- **Portada:** `paginas`, `ilustracion`.

### Conversión a PDF/X-3 (CMYK)

1. Copia el `PDFX_def.ps` de Ghostscript (`find /usr/share/ghostscript -name PDFX_def.ps`) a esta carpeta.
2. Edita dos líneas:
   - `/ICCProfile (…)`: ruta **absoluta** al perfil ICC que dé la imprenta. Para pruebas sirve `default_cmyk.icc` de Ghostscript, copiado a una ruta local.
   - `/Title (…)`: título del libro.
3. Pasa ese archivo con **ruta absoluta**. Si no, Ghostscript usa el suyo del sistema y falla con `undefinedfilename`.

```bash
gs -q -dPDFX -dBATCH -dNOPAUSE -dNOSAFER -sDEVICE=pdfwrite \
  -sColorConversionStrategy=CMYK -sProcessColorModel=DeviceCMYK \
  -sOutputFile=interior-pdfx.pdf "$PWD/PDFX_def.ps" interior-rgb.pdf
```

Ojo: en Ghostscript 10.02 la opción es `-dPDFX` (booleana); `-dPDFX=3` truena.

### Verificaciones

```bash
pdffonts interior-pdfx.pdf
```

```bash
gs -q -o - -sDEVICE=inkcov interior-pdfx.pdf
```

```bash
zbarimg -q portada.png
```

- `pdffonts`: todas las fuentes deben salir incrustadas.
- `inkcov`: cobertura C M Y K por página. En el texto, C = M = Y = 0.
- `zbarimg`: lee el código de barras (sobre un PNG de la portada a 300 ppp).

## Resultados medidos el 2026-11-23

- **Interior:**
  - 14 páginas de 5.5 × 8.5 in.
  - Libertinus y Tangerine incrustadas.
  - Separación silábica en español correcta y justificado sin ríos.
- **PDF/X:**
  - `GTS_PDFXVersion (PDF/X-3:2002)`, `OutputIntents` y `TrimBox` presentes.
  - Sin `DeviceRGB`.
  - Texto con tinta **solo K** (páginas 1 a 3: C 0, M 0, Y 0, K 3.7 % a 5.9 %).
- **Portada:**
  - 850 × 665 pt.
  - Lomo de 1.8 mm para 36 páginas (calibre de prueba de 0.1 mm por hoja).
  - Convertida a PDF/X-3 sin RGB.
  - EAN-13 leído por `zbarimg` (`9783161484100`, **ISBN de ejemplo**, no de Huapango).
- **Velocidad:**
  - Cuento en frío: 0.04 s; recompilación: ~0 s.
  - Libro de ~33,000 palabras (131 páginas): 0.40 s.
  - Conversión a PDF/X del libro grande con Ghostscript: 2.1 s.

## Calibración contra el impreso (2026-11-24)

```bash
.venv/bin/python -c "import typst; typst.compile('coleccion-cuentos.typ', output='interior.pdf', font_paths=['fonts'], ignore_system_fonts=True, sys_inputs={'autor':'Oscar Wilde','titulo':'El príncipe feliz'})"
```

```bash
pdftoppm -r 50 -f 1 -l 3 -png interior.pdf nuestro
```

```bash
pdftoppm -r 50 -f 27 -l 29 -png ../imprenta/EL_PRINCIPE_FELIZ_22OCTUBRE2026.pdf impreso
```

```bash
montage impreso-*.png nuestro-*.png -tile 3x2 -geometry +4+4 comparacion.png
```

Resultado: misma caja, cuerpo, interlineado y estructura. Diferencias pendientes:

- Capitular descolgada.
- Ornamento de la cornisa (golondrina y puntos).
- Folio en Explora (descargarla de Google Fonts a `fonts/`).
- Foliado continuo: requiere componer el libro completo con preliminares.

## Limitaciones conocidas

- **Capitular:** en el prototipo es una versal sin descolgar. Typst no rodea texto alrededor de un elemento. El paquete `droplet` (Typst Universe) lo resuelve, pero en esta sesión no se pudo usar (`packages.typst.org` bloqueado y no se permitió ejecutar el paquete descargado). Hay que revisarlo y vendorizarlo, o escribir uno propio.
- **PDF/X-1a / X-4:** solo se probó PDF/X-3 con Ghostscript. Cuál pide la imprenta: **por confirmar**.
- **Sin validación certificada:** falta _preflight_ con una herramienta comercial (Acrobat Pro o callas pdfToolbox) y **prueba física con la imprenta**.
- **Perfil ICC genérico:** el real lo da la imprenta (FOGRA39, GRACoL, SWOP…).
- **Ilustración a 147 ppp en la portada:** el PNG del EPUB es de 825 px. Se necesita el original a 300 ppp.
