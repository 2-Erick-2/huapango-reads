# Panel de la editorial: plan completo

> Plan para el panel donde Editorial Huapango escribirá sus libros nuevos, los publicará en +reads y los imprimirá. Se apoya en [ADR 0011](../decisiones/0011-alcance-del-editor-editorial.md), [ADR 0013](../decisiones/0013-taller-editorial-completo-con-pdf-de-imprenta.md), [ADR 0016](../decisiones/0016-formato-canonico-v1-e-importador-en-node.md) y en el análisis [taller editorial completo](2026-11-23-taller-editorial-completo.md). Fecha: 2026-11-24.

> **Estado (2026-11-24):** el _spike_ del editor está hecho y comprobado ([ADR 0018](../decisiones/0018-editor-prosemirror-sobre-el-formato-canonico-y-panel-solo-local.md)): ProseMirror con el formato canónico como esquema, viaje de ida y vuelta exacto sobre las 8 piezas reales, revisión en vivo, borrador local y descarga. Existe un primer corte del panel solo local (`/panel`). Falta todo lo de la Fase A que depende de Supabase (cuentas, versiones, guardado) y la pantalla "Importar y revisar".

## 1. ¿Ya podemos empezar con el diseño?

**Sí para el diseño de pantallas; no todavía para el diseño fino del editor.**

- **Ya está resuelto lo que más riesgo tenía:** existe el formato canónico, un importador que demuestra que no se pierde texto, los dos libros reales cargados y un lector que los pinta. Eso es la mitad "difícil y desconocida" del panel; el resto es producto sobre una base que ya funciona.
- **Falta decidir una tecnología antes de diseñar el editor:** si el editor se construye con ProseMirror (recomendado) dentro de Solid. Hace falta un _spike_ de 3 a 4 días antes de dibujar sus barras y paneles, porque la forma del editor depende de eso.
- **Orden de diseño recomendado** (en Claude Design, mismo sistema visual de +reads pero en claro/papel para trabajar horas): 1) Importar y revisar, 2) Biblioteca y ficha de obra, 3) Publicar, 4) Editor, 5) Imprimir. Las 3 primeras ya se pueden dibujar; el editor y la impresión después del _spike_ y de la Fase 0 del taller.

## 2. Cómo trabaja hoy la editorial y qué cambia

| Hoy                                                           | Con el panel                                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Maquetan en **InDesign**; exportan EPUB y PDF.                | Escriben o importan en el panel; el panel genera PDF de imprenta, EPUB y la lectura en +reads. |
| Imprimen ellos mismos con "Folleto" de Acrobat (hojas carta). | El panel exporta el folleto ya impuesto (ADR 0015) y las páginas media carta.                  |
| Mandan 3 EPUB por libro, a veces el libro entero tres veces.  | Se sube lo que tengan y el panel pregunta qué es cada cosa (mapeo asistido).                   |
| Los textos externos (prólogo, nota…) viajan aparte.           | Son **complementos** ligados al libro (ADR 0012), con su propia firma y su propia lectura.     |
| Revisión por WhatsApp con capturas.                           | Comentarios sobre el texto y vista previa en celular/escritorio.                               |

## 3. Pantallas y módulos

1. **Biblioteca.** Obras con portada, estado (borrador, en revisión, listo, publicado), última edición y quién. Filtros por colección y estado. Acciones: nueva obra, importar, abrir.
2. **Ficha de obra.** Metadatos del catálogo (los mismos campos de `Book`: título, autores, colección, géneros, sinopsis, cita, ISBN digital, precio, créditos con su rol, portada). Lista de piezas (libro y complementos) con arrastrar para ordenar. Todo campo "por confirmar" se muestra como pendiente, nunca vacío.
3. **Importar y revisar** (la pantalla más importante al inicio).
   - Subir EPUB (y después Word). Detecta documentos, clases, imágenes y textos de firma.
   - **Mapeo asistido:** muestra el texto con colores por rol (título, firma, cuerpo, ignorar), propone el corte en piezas y deja corregirlo con clics, no editando JSON.
   - **Informe de integridad** en pantalla (las mismas comprobaciones de `informe.md`) con el tramo exacto donde algo difiere.
   - Vista previa en 390, 768 y 1440 px y en los tres temas.
4. **Editor.** Página con bloques (título, párrafo, firma, imagen, separador, ornamento), estilos con nombre, capitular, énfasis, imágenes con recorte y texto alternativo, notas al pie, buscar y reemplazar, corrector ortográfico, historial de versiones, comentarios. Barra lateral de estructura (capítulos).
5. **Publicar.** Lista de verificación automática (formato válido, sin párrafos cortados, todas las imágenes con permiso y alt, metadatos completos, ISBN, autorización de distribución). Vista previa final. Un botón; queda una **versión inmutable** que se puede revertir.
6. **Imprimir.** Plantilla por colección ("Cuentos a todas partes"…), parámetros editables (tamaño, márgenes, tipografía, división de palabras), vista previa del PDF, **preflight** (resolución de imágenes, fuentes incrustadas, páginas múltiplo de 4), exportar media carta y folleto impuesto, y portada extendida con lomo y EAN-13.
7. **Usuarios y permisos.** Administrador, editor, revisor (solo ve y comenta) y, a futuro, autor.
8. **Ventas y regalías** (Hito 3): panel de lectura para la editorial.

## 4. Modelo de datos (Supabase, con RLS)

| Tabla                                         | Contenido                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `obras`                                       | Metadatos del catálogo, colección, estado, portada. Una fila por libro.                             |
| `piezas`                                      | `obra_id`, `slug`, `kind` (libro/complemento), orden, título, firma. Apunta a su versión vigente.   |
| `versiones`                                   | `pieza_id`, número, **documento canónico (JSONB)**, autor, fecha, nota, `hash`. Inmutables.         |
| `archivos`                                    | Imágenes y originales subidos (Storage privado): tipo, hash, tamaño, rol, alt, permiso/procedencia. |
| `importaciones`                               | Fuente subida, mapeo (JSON), informe de verificación, resultado, quién y cuándo.                    |
| `comentarios`                                 | Anclados a un bloque por `id` y huella (sobreviven a ediciones).                                    |
| `publicaciones`                               | Versión publicada de cada pieza, quién la aprobó, fecha, reversión.                                 |
| `plantillas_impresion` / `trabajos_impresion` | Plantilla por colección y cada exportación (parámetros, PDF resultante, preflight).                 |
| `perfiles` / `roles`                          | Usuarios y permisos. RLS por rol y por obra.                                                        |
| `auditoria`                                   | Quién hizo qué y cuándo (publicar, revertir, borrar, cambiar permisos).                             |

El documento canónico es el mismo `Pieza` del ADR 0016: **un solo formato** para importar, editar, leer, imprimir y exportar EPUB. Ya tiene `id` y `hash` por bloque, que son las anclas de comentarios, progreso de lectura y subrayados.

## 5. Arquitectura

- **Panel:** parte de la misma app SolidStart, bajo `/panel`, con rutas protegidas y su propio layout. Comparte tipos y utilidades con el lector.
- **Importador y verificación:** el código de `scripts/ingesta/` se reutiliza tal cual como biblioteca en una función de servidor (Node), con los mismos límites de tamaño y rechazo de archivos inseguros. Corre al subir, no en el navegador.
- **Editor:** ProseMirror con un esquema que es el formato canónico (cada nodo es un bloque tipado). Guardado automático cada pocos segundos creando _borradores_; "guardar versión" crea una versión inmutable.
- **Impresión:** servicio aparte (contenedor con Typst + Ghostscript o equivalente) con cola en Supabase. Hoy es un prototipo en `prototipos/taller-impresion/`. Ghostscript es AGPL: decisión legal pendiente (ADR 0014).
- **Publicar al lector:** copiar la versión aprobada a Storage y servirla por la Edge Function `get-chapter` (Hito 2). El lector no cambia: ya consume el formato canónico.
- **Imágenes:** subida con validación y conversión a WebP en dos tamaños (tarea pendiente del importador).

## 6. Fases, entregables y estimación

Un solo desarrollador a tiempo completo. Las semanas son de trabajo efectivo, con pruebas incluidas.

| Fase  | Entregable                                                                                                                        | Semanas | Depende de                                            |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | :-----: | ----------------------------------------------------- |
| **A** | **Importar y publicar.** Login, Biblioteca, subir EPUB, mapeo asistido, informe, vista previa, publicar con versión inmutable.    |   3–4   | Supabase (Hito 2: Auth, esquema, Storage)             |
| **B** | **Ficha de obra y catálogo en base de datos.** Metadatos, complementos, portadas, lista de verificación de publicación.           |   2–3   | A                                                     |
| **C** | **Editor.** _Spike_ de ProseMirror (3–4 días), luego bloques, estilos, imágenes, notas, historial y búsqueda.                     |   6–8   | A, B                                                  |
| **D** | **Imprimir.** Plantilla de "Cuentos a todas partes", PDF media carta y folleto, preflight, portada con lomo y EAN. Prueba física. |   4–6   | Fase 0 del taller (datos de imprenta y prueba física) |
| **E** | **Revisión y colaboración.** Comentarios anclados, revisor, aprobaciones, notificaciones.                                         |   3–4   | C                                                     |
| **F** | **Exportar EPUB 3 y Word**, importar Word, EPUBCheck en CI.                                                                       |   2–3   | A                                                     |

**Total aproximado: 20 a 28 semanas.** A y B son las que dan valor visible más pronto (la editorial ya puede publicar sin tocar código). La **D depende de datos que solo tiene la editorial** (ver `docs/editorial/solicitud-datos-imprenta.md`): conviene pedirlos ya.

## 7. "Funcional y sin errores": cómo se garantiza

Nada serio es "100 % sin errores"; lo que sí se puede asegurar, y es lo que se hará:

1. **Nada se publica si la verificación falla.** La misma verificación del importador (texto íntegro, sin párrafos cortados, imágenes con permiso y alt, metadatos completos) es una condición de "Publicar", no una sugerencia.
2. **Todo cambio es una versión inmutable y reversible.** Revertir es un clic y queda en la auditoría.
3. **Una sola fuente de verdad** (el formato canónico) y pruebas de contrato sobre él: lo que el editor guarda lo valida `validatePieza` antes de entrar a la base de datos.
4. **Pruebas en capas:** unitarias (formato, importador, editor), de integración (base de datos con RLS en una instancia de prueba) y de punta a punta en un navegador real (`npm run e2e:humo` ya existe; pasa a CI).
5. **Entornos:** desarrollo, _staging_ con datos de prueba y producción; migraciones versionadas; respaldos y prueba de restauración.
6. **Observabilidad:** Sentry y registros de errores del importador y de la impresión, con alertas.
7. **Accesibilidad y rendimiento como criterio de aceptación** (teclado completo, lectores de pantalla, Lighthouse), igual que en +reads.
8. **Archivos subidos = entrada no confiable:** límites de tamaño, rechazo de rutas y cifrado, análisis en un trabajo aislado (ya implementado en el importador).

## 8. Decisiones que necesitamos de la editorial y del dueño

1. **¿Quién escribirá directamente en el panel?** ¿Solo la editorial, o también los autores? Define roles y permisos.
2. **¿Escribirán desde cero o seguirán maquetando en InDesign?** Si es lo segundo, la prioridad es A, B y F; si es lo primero, C sube.
3. **Datos de imprenta pendientes:** PDF de forros y `.joboptions`, modelo de impresora, papel y calibre, engrapado o pegado, prueba física (para la Fase D).
4. **Hosting del panel** (Vercel Pro o Cloudflare, no Hobby por uso comercial) y **dónde corre el servicio de impresión.**
5. **Licencias:** Ghostscript (AGPL) y fuentes (solo libres u OFL; las de pago requieren licencia).
6. **Derechos de las piezas externas** (prologuistas, ilustradores, traductora): el panel debe guardar la autorización de distribución digital por pieza.
7. **¿Los complementos son gratis, se venden o vienen incluidos?** Afecta compras y regalías.
8. **Quién aprueba una publicación** (un rol) y si se necesita una segunda persona.

## 9. Riesgos

- **El editor es lo más grande del plan.** Un editor de texto serio tiene muchos casos límite; por eso va después de A y B y con un _spike_ antes.
- **Sin los datos de imprenta no se puede cerrar la Fase D** ni prometer que el PDF sale "perfecto".
- **Una sola persona** desarrollando 6 fases: el calendario es sensible a cualquier cambio de alcance.
- **Contenido con derechos en un repositorio público:** el panel debe sacarlo del repositorio (Storage privado). Es una condición del Hito 2.
- **Stack nuevo** (SolidStart 2, Nitro v3 beta, TypeScript 6, Vite 8): vigilar actualizaciones.
