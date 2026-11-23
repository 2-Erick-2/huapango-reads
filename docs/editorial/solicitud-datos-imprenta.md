# Solicitud de datos a la imprenta y a la editorial (Fase 0 del taller)

> Para la **Fase 0** del taller editorial ([ADR 0013](../decisiones/0013-taller-editorial-completo-con-pdf-de-imprenta.md)). Con estas respuestas se configura la exportación a PDF de imprenta. Cuando lleguen, guarda los archivos en `contenido-privado/imprenta/` (no se suben al repo), anota las respuestas en este documento y pide a Claude que analice el PDF de referencia.

## Qué es "la versión de PDF/X" (explicación corta)

PDF/X es un PDF "con reglas de imprenta": fuentes incrustadas, colores en CMYK y un perfil de color que dice cómo se va a imprimir. Hay varias versiones y cada imprenta acepta una o dos:

| Versión      | Qué permite                                                        | Cuándo la piden                                                    |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **PDF/X-1a** | Solo CMYK, sin transparencias (las "aplana")                       | La más común en imprentas offset tradicionales; la más segura      |
| **PDF/X-3**  | CMYK y también RGB o colores con perfil, que la imprenta convierte | Menos común hoy                                                    |
| **PDF/X-4**  | Como X-3, pero con transparencias vivas (sin aplanar)              | Imprentas modernas y digitales; es lo que exporta InDesign "nuevo" |

El prototipo ya produce **PDF/X-3**. Si la imprenta pide X-1a o X-4, se ajusta, pero hay que saberlo para no mandar un archivo que rechacen o que impriman con colores distintos.

## Lo más útil (si solo pueden mandar 2 cosas)

1. **Un PDF que ya hayan mandado a esa imprenta y que se imprimió bien** (de cualquier libro de Huapango). De ese archivo Claude puede sacar casi todo: versión de PDF/X, perfil de color, sangrado, tamaño, fuentes y tinta.
2. **El preset de exportación de InDesign que usan para la imprenta** (archivo `.joboptions`). Se saca en InDesign: _Archivo → Ajustes preestablecidos de Adobe PDF → Definir… → seleccionar el que usan → Guardar como…_. Ahí viene la configuración exacta.

## Mensaje listo para mandar a la imprenta

> Hola, buen día. Estamos preparando los archivos de Editorial Huapango con un nuevo sistema de producción y queremos asegurarnos de entregarles exactamente lo que necesitan. ¿Nos podrían compartir sus especificaciones técnicas para archivos de impresión de libros?
>
> 1. ¿Qué versión de PDF aceptan? (PDF/X-1a, PDF/X-3 o PDF/X-4)
> 2. ¿Qué perfil de color usan? (por ejemplo Coated FOGRA39, GRACoL, SWOP o uno propio). Si es propio, ¿nos pueden mandar el archivo .icc?
> 3. ¿Cuánto sangrado necesitan? (3 mm o 0.125 in) ¿Y quieren marcas de corte?
> 4. ¿Cuál es la cobertura máxima de tinta (TAC)? (por ejemplo 300 %)
> 5. ¿El texto negro debe ir en 100 % K? ¿Aceptan negro enriquecido en portadas?
> 6. ¿Resolución mínima de imágenes? (por ejemplo 300 ppp)
> 7. ¿En múltiplos de cuántas páginas imprimen el interior (pliego de 8, 16 o 32)?
> 8. ¿Qué papel y gramaje usamos en interiores y en forros, y cuál es su calibre (grosor por hoja) para calcular el lomo?
> 9. ¿Interior y portada van en archivos separados? ¿La portada va extendida (contraportada + lomo + portada) en un solo archivo?
> 10. ¿Tienen una plantilla o guía para portadas, o un documento de especificaciones que nos puedan enviar?
> 11. ¿Podrían hacernos una prueba de color/impresión de un libro antes del tiraje?
>
> ¡Muchas gracias!

## Qué pedir a la editorial

- [ ] PDF de un libro que ya se imprimió bien en esa imprenta (interior y portada).
- [ ] El preset `.joboptions` de InDesign que usan para esa imprenta.
- [ ] Tamaño final de cada colección (p. ej. _El príncipe feliz_: ¿5.5 × 8.5 in?).
- [ ] Fuentes que usan y su licencia (¿Minion Pro desde Adobe Fonts?).
- [ ] Ilustraciones originales a 300 ppp (las golondrinas que tenemos quedan a 147 ppp).
- [ ] El `.indd` o el PDF final de _El príncipe feliz_, para copiar el diseño en la plantilla.

## Respuestas (llenar cuando lleguen)

| Dato                          | Respuesta | Fecha |
| ----------------------------- | --------- | ----- |
| Imprenta (nombre)             |           |       |
| Versión de PDF/X              |           |       |
| Perfil de color (ICC)         |           |       |
| Sangrado / marcas de corte    |           |       |
| Cobertura máxima de tinta     |           |       |
| Negro de texto / enriquecido  |           |       |
| Resolución mínima             |           |       |
| Múltiplos de páginas (pliego) |           |       |
| Papel interior y calibre      |           |       |
| Papel de forros y calibre     |           |       |
| Formato de portada            |           |       |
| Prueba de impresión           |           |       |
