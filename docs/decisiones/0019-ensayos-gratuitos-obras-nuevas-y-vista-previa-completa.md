# 0019 — Ensayos gratuitos, obras nuevas desde el panel y vista previa completa

- **Fecha:** 2026-11-24
- **Estado:** Aceptada
- **Decide:** Erick, con recomendación técnica

## Contexto

Tres pedidos de Erick al probar la versión estable:

1. El inicio tenía una fila "Lecturas cortas" que no encajaba. El dueño quiere en su lugar una fila de **ensayos**, de acceso libre, que **se suban desde el panel**.
2. El panel debe poder **crear una obra nueva** (libro o ensayo).
3. La vista previa del editor era una columna angosta: debe verse **completa**, tanto para lectura como para impresión.

## Decisión

**1. "Ensayo" es un tipo de obra.** `PiezaKind` gana el valor `"ensayo"`: una obra de una sola pieza, gratuita, sin ficha de catálogo. `mainEntry` del manifiesto devuelve el libro o el ensayo; el lector (`/leer/<obra>`) funciona igual. El manifiesto admite `summary` y `authors` opcionales. La fila **Ensayos** del inicio sale de los manifiestos (`essays()` en `shelves.ts`); mientras no haya ninguno, dice "Muy pronto" en lugar de inventar contenido. "Lecturas cortas" se eliminó.

**2. Una sola fila para todo el inicio.** `Carousel` (título, flechas, scroll nativo) es el componente de todas las filas (`BookRow`, "Continúa leyendo", "Ensayos"). Así quedan alineadas entre sí y todas llevan flechas. Una prueba de navegador exige que los encabezados compartan margen izquierdo.

**3. Obras nuevas = borrador local + paquete JSON.** `/panel/nuevo` crea una obra (libro o ensayo) con título, autoría, resumen e identificador. Vive en `localStorage` (`hr:panel:obras`) mientras no haya servidor. Un libro admite complementos (prólogo, epílogo…); un ensayo, una sola pieza. Al estar lista (`validarPaquete` sin errores) se descarga como **`paquete.json`** (`PaqueteObra`, `src/lib/libro/paquete.ts`). Se coloca en `contenido-privado/<obra>/paquete.json` y `npm run contenido:publicar` lo valida con las mismas reglas del importador y lo publica (acepta BOM). Un paquete aún **no lleva imágenes** (el editor no las sube todavía). Verificado de punta a punta con un ensayo de prueba: aparece en la fila "Ensayos" y se abre en el lector; luego se retiró y el contenido real quedó byte a byte igual.

**4. Vista previa a pantalla completa**, en un diálogo (`PreviewModal`) con dos salidas:

- **Lectura (+reads):** el `Reader` real en modo `embedded` (ocupa el alto del contenedor, no lee ni guarda la posición del dispositivo, la salida es un callback).
- **Impresión (media carta):** `PrintPreview` compone el texto en hojas de 5.5 × 8.5 in con márgenes de 0.625 in mediante columnas CSS (cada columna es una hoja), con folio y zoom, y cuenta las páginas y cuántas faltan para múltiplo de 4 (folleto de Acrobat, ADR 0015). Es una **vista aproximada**: el PDF final lo compone el taller de impresión.

**5. La autoría de una pieza sin firma se conserva al editar** (`docToPieza`): antes se perdía al volverse `null`; ahora solo se borra si la pieza tenía firma y se quitó.

## Alternativas consideradas

- **Servidor de archivos local para "Publicar" desde el panel:** habría evitado copiar el paquete a mano, pero exige un endpoint con escritura en disco y reconstruir la app; no se justifica hasta tener Supabase (guardar y publicar sin tocar archivos).
- **Ensayos como libros con precio cero:** obligaba a fichas de catálogo, portada y precio para algo que es solo texto.
- **Componer la impresión con una copia del texto por hoja:** duplicaría el contenido decenas de veces; las columnas CSS lo componen una vez.

## Consecuencias

- **Un libro nuevo del panel todavía no tiene ficha en el catálogo** (necesita portada, precio y colección en `catalog/data.ts`); sí se puede leer en `/leer/<obra>`. Un ensayo no necesita ficha.
- **Límites de la impresión:** sin división silábica fina, viudas/huérfanas ni cuadro de imagen a medida; sirve para ver extensión y caídas, no para dar el PDF final.
- **Sigue sin haber cuentas:** los borradores viven en el navegador y se pierden si se borra su almacenamiento; la salida de seguridad es descargar el paquete. El panel sigue siendo solo local.
- Pendiente: imágenes en obras nuevas, ficha de catálogo desde el panel, guardado y versiones en Supabase.
