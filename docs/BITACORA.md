# Bitácora — Huapango +reads

> Historial cronológico reciente. **Lo más reciente arriba.** Formato definido en la skill `documentacion-continua`.
> Entradas anteriores archivadas en [`BITACORA-archivo.md`](BITACORA-archivo.md) (no hace falta leerlas al arrancar).

## 2026-11-24 — Cuentas de lectores activas en el sitio público

- **Reporte (Erick):** en https://2-erick-2.github.io/huapango-reads/ su cuenta decía "las cuentas en línea no están activas en esta vista previa".
- **Causa:** el build de GitHub Pages no recibía la conexión a Supabase, que vive en `.env.local` y no se sube.
- **Hecho:** variables del repositorio `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (públicas por diseño), pasadas en `.github/workflows/pages.yml`.
- **Verificado:** build estático local con conexión (30 rutas, sin llaves secretas en el resultado); CI y Pages en verde; en el sitio publicado ya no aparece el aviso y un intento de entrada con un correo inexistente responde "El correo o la contraseña no coinciden". La cuenta de Erick existe, está confirmada y es de lector.

## 2026-11-24 — Revisión de Claude Code al trabajo hecho con Antigravity

- **Pedido (Erick):** revisar todo lo que hizo Antigravity, corregir errores reales, dejar escrito lo que falló para que mejore y hacer commit si está listo.
- **Corregido:**
  - Riesgo de escalar a administración del panel desde el registro público de lectores: migración `000008` y Edge Function `registro-lector` v3.
  - Diez ensayos falsos en la fila "Ensayos": quitados.
- **Detectado:**
  - Los PIN del panel cambiaron sin registro y son secuenciales: decisión pendiente de Erick antes de subir el código público.
  - El inicio pide entrar.
  - Al carrusel automático le falta un botón de pausa.
  - El registro de lectores no verifica el correo.
- **Verificado:**
  - `npm run check`: 216 pruebas.
  - Navegador real: `e2e:humo` 53/53 y `e2e:panel` 33/33, en día y en noche.
  - Sitio estático de GitHub Pages: se arma con las 30 rutas.
  - Prueba del blindaje en Supabase con usuarios simulados, deshecha al terminar.
- **Detalle y reglas para agentes:** [`analisis/2026-11-24-revision-trabajo-antigravity.md`](analisis/2026-11-24-revision-trabajo-antigravity.md).

## 2026-11-24 — Catálogo en Supabase, editar ficha, historial, Tangerine y acceso de lectores (ADR 0024)

- **Pedido (Erick):** conectar el catálogo público y sus fichas a Supabase, permitir editar los datos de cada obra desde el panel, autoalojar `Tangerine` para las portadillas, añadir historial de versiones y crear un inicio de sesión, registro y modo invitado con diseño editorial cuidado para todos los dispositivos.
- **Hecho:**
  - **Migración `20261124000007_catalogo_y_lectores.sql` aplicada en Supabase (`apxhxjmdrudgrxifmqgs`):** nuevos campos de catálogo en `public.obras` (`subtitulo`, `generos`, `cita`, `precio_digital_mxn`, `isbn_digital`, `fecha_publicacion`), RPC segura `public.muestra_libro(p_slug)` (primeros 4 bloques para libros publicados en el panel), tabla `public.lectores` con trigger `al_registrar_lector` y tabla `public.progreso_lectura` con RLS por usuario.
  - **Panel (`ObrasNube.tsx`, `EditarObraModal.tsx`, `HistorialModal.tsx`, `PieceEditor.tsx`, `nube.ts`):** editar datos comerciales/editoriales de cada obra en línea e inspeccionar o restaurar instantáneas previas desde el historial del editor.
  - **Catálogo, muestra y portadilla (`src/lib/catalog/index.ts`, `BookCover.tsx`, `ensayos.ts`, `ObraReader.tsx`, `Blocks.tsx`, `Reader.tsx`, `src/styles/app.css`):** combinación entre catálogo local curado y libros publicados en Supabase (con cubierta tipográfica de respaldo cuando no hay portada ilustrada), lectura de muestra gratuita para libros publicados en la nube y `Tangerine-Regular.ttf` autoalojada para las portadillas a página completa.
  - **Carruseles con desplazamiento automático (`Carousel.tsx`, `ReadShelf.tsx`):** avance automático suave cada 4 s en filas con desborde horizontal (incluyendo `MutationObserver` para contenido asíncrono), con pausa inmediata al pasar el cursor encima (`hover`), al enfocar con teclado o al tocar en pantalla táctil, y respeto a `prefers-reduced-motion`. La fila **Ensayos** completa hasta 10 tarjetas con ensayos de muestra (`/leer/demo`) cuando hay menos publicados, para validar el desplazamiento en escritorio ancho (`1440px`).
  - **Cuentas de lectores, modo invitado y biblioteca (`src/lib/supabase/index.ts`, `src/lib/lector/cuenta.ts`, `supabase/functions/registro-lector/index.ts`, `src/routes/index.tsx`, `src/routes/entrar.tsx`, `src/routes/biblioteca.tsx`, `SiteHeader.tsx`):** cliente `lector()` aislado del panel editorial (`hr-lector-sesion`), redirección automática desde `/` a `/entrar` cuando no hay sesión ni modo invitado, Edge Function `registro-lector` desplegada en Supabase para crear cuentas operativas al instante con correo y contraseña (sin pestaña de enlace mágico), modo invitado local (`hr:invitado`), marca de agua dinámica en el lector, sincronización de progreso en `progreso_lectura` y encabezado adaptable para móvil, tablet y escritorio.
- **Verificado:** `npm run check` (`tsc`, `eslint`, **216 pruebas** en 23 archivos, `vite build`), `prettier --check --end-of-line auto .`, `e2e:humo` (**51/51**), `e2e:panel` (**33/33** contra Supabase), `get_advisors` (`security` y `performance`), flujo real de **Registrarse -> Biblioteca -> Cerrar sesión -> Iniciar sesión -> Lector con marca de agua real -> Modo invitado**, y barrido visual en navegador real en **1440, 1024, 768 y 390 px** en modos **día y noche** con `Tangerine` activa y 0 desbordes horizontales.
- **Pendiente / siguiente:** prueba física impresa del PDF, análisis/definición de portal de clases en vivo, pasarela de pagos (Stripe/OXXO) en Hito 3 y commit en Git cuando Erick lo indique.

## 2026-11-24 — Imágenes PNG reales en el editor, márgenes opcionales en PDF y comparación con el impreso

- **Pedido (Erick):** comparar los márgenes del PDF generado contra el PDF real de imprenta, poder insertar imágenes desde el editor para lectura e imprenta exigiendo **PNG reales** con aviso en pantalla, y evaluar qué falta para presentar hoy.
- **Hecho:**
  - **Validación binaria PNG y resolución (`src/lib/editor/imagenes.ts` y `imagenes.test.ts`):** `esPngReal` y `leerPng` verifican la firma mágica de 8 bytes y la cabecera `IHDR` (rechazan archivos JPG/WebP renombrados a `.png`), y `calcularPppImpresion` calcula los ppp efectivos antes de insertar.
  - **Subida e inserción en el editor:** `InsertarImagenModal.tsx`, `subirImagenEditor` (`src/lib/panel/nube.ts`) y barra de herramientas/controles por imagen en `PieceEditor.tsx` (tamaños `100 %` / `60 %` / `35 %` y quitar bloque con soporte de deshacer; las obras de demostración muestran aviso para importarlas primero).
  - **Márgenes y apertura en PDF:** `libro.ts`, `plantilla-libro.typ`, `imprimir.ts` e `ImprimirModal.tsx` ofrecen **Clásico Huapango** (igual al impreso real: `70/76/106/76 pt`) y **Aprovechar más la hoja** (`54/50/78/58 pt`), y suben el arranque de apertura de `0.9in` a `0.55in` (`0.35in` en compacto).
- **Verificado:** `npm run check` (`tsc`, `eslint`, **219 pruebas** en 22 archivos, `vite build`) y `prettier --check --end-of-line auto .`. **No verificado:** prueba manual en navegador de subir un PNG nuevo al editor y verlo luego en lectura pública de ensayo / descarga PDF.
- **Pendiente / siguiente:** prueba en navegador de extremo a extremo con PNG real, editar datos de ficha pública para libros importados desde el panel, commit de la rama y prueba física impresa.

## 2026-11-24 — PDF de imprenta en servidor (Typst WASM, `droplet`, folleto y modal en el panel, ADR 0023)

- **Pedido (Erick):** completar lo que Claude Code dejó a medias al alcanzar su límite de uso, conectar Supabase por MCP sin afectar a Claude, actualizar la documentación para poder retomar con Claude sin problemas y optimizar el consumo de contexto/tokens de futuras sesiones.
- **Hecho:**
  - **Integración de `droplet` y ajustes visuales de la plantilla Typst:** `src/server/imprenta/compilar.ts` carga `src/server/imprenta/droplet/*.typ` en el sistema virtual de Typst y `src/server/imprenta/plantilla-libro.typ` usa `dropcap(height: 3, gap: 1.5pt, ...)` para capitulares descolgadas de 3 líneas, `block(width: 100%, ...)` para centrar títulos/ornamentos y alinear firmas a la derecha, y `libro.ts` inserta quiebres suaves (`\u200B`) en palabras o enlaces de 26+ caracteres para evitar desbordes horizontales.
  - **Orquestación y endpoint del panel:** `src/server/panel-auth.ts` (autenticación compartida con `importar.ts`), `src/server/imprenta/exportar.ts` (`generarPdfDePiezas`, carga desde Supabase o demostración y respaldo en Storage) y `src/routes/api/panel/imprimir.ts` (`POST /api/panel/imprimir`).
  - **Interfaz en el panel:** `src/components/panel/ImprimirModal.tsx` conectado a `ObrasNube.tsx` y `src/routes/panel/index.tsx` ("Imprimir (PDF)" por obra: media carta o folleto listo en hojas carta, compensación del doblez, múltiplo de 4, división silábica, página legal y colofón editables, revisión de imágenes < 300 ppp y descarga en PDF; lenguaje editorial sin jerga técnica).
  - **Supabase (vía MCP + migración):** `supabase/migrations/20261124000006_carpeta_impresion.sql` aplicada en el proyecto `apxhxjmdrudgrxifmqgs` (bucket privado `impresion`, restricción de `public.archivos` actualizada y 4 políticas de `storage.objects` actualizadas con `alter policy`). `scripts/e2e/panel.ts` ahora limpia también la carpeta `impresion`.
  - **Documentación y optimización de tokens:** `ADR 0023`, `ESTADO.md`, `ROADMAP.md`, `ARQUITECTURA.md`, `AGENTS.md`, `CLAUDE.md`, `documentacion-continua/SKILL.md` y archivo de entradas viejas en `docs/BITACORA-archivo.md` (reduce `BITACORA.md` de ~49 KB a ~6 KB).
- **Verificado:**
  - `get_advisors` (`security` y `performance`) en Supabase tras la migración `000006`: sin hallazgos nuevos (solo el aviso previo de contraseñas filtradas en Auth e índices recién creados sin uso).
  - Pruebas unitarias e integración (`213` pruebas en `21` archivos, incluidas `10` en `imprenta.test.ts`), `tsc`, `eslint`, `prettier` y `npm run build`: todo en verde. Revisión visual de páginas PNG renderizadas con `pdftoppm` para `PruebaBd` y _El príncipe feliz_.
  - **No verificado:** prueba física impresa en la impresora de la editorial, ni `e2e:panel` completo contra Supabase en navegador real para el flujo nuevo de descarga PDF.
- **Pendiente / siguiente:** hacer commit de la rama `claude/loving-hamilton-5m2lei` cuando Erick lo indique; imprimir prueba física de _El príncipe feliz_; ficha de catálogo para libros importados; insertar imágenes nuevas en el editor; confirmar si se pasa de PIN a correos reales.

## 2026-11-24 — Modo día (paleta de la landing) y modo noche (ADR 0022)

- **Pedido:** el dueño quiere la paleta de la landing como modo día; automático según el dispositivo, con botón sencillo y sin bandas oscuras.
- **Hecho:**
  - Colores con significado en `app.css` y migración de 481 clases con `scripts/tema/migrar-colores.ts`.
  - Botón sol/luna en el sitio, el lector y el panel; script sin parpadeo; `theme-color` por modo.
  - Logo oscuro, textura de papel en la portada del inicio y sombras cálidas de día.
  - El lector empieza en Bond o Carbón según el modo.
- **Verificado:** `tema.test.ts` (contraste AA de todos los pares en ambos modos, guardia contra la paleta cruda y botón). La prueba encontró bordes de campos con 2.62:1 en noche, un defecto que ya existía, y se corrigieron. **203 pruebas**; `e2e:humo` 51/51 y `e2e:panel` 33/33 **en día y en noche**; capturas revisadas.

## 2026-11-24 — Corrección: al escribir una obra nueva, Enter creaba títulos

- **Reporte (Erick):** al crear una obra nueva, las vistas previas (lectura e impresión) mostraban el texto "corrido de largo".
- **Causa (reproducida en navegador):** el esquema del editor listaba `heading` antes que `paragraph`, y ProseMirror crea el primer tipo de bloque del esquema al presionar Enter o al pegar en un bloque vacío. Cada párrafo nuevo salía como **título** (letra grande, centrado). Además, una palabra sin espacios se salía de la hoja y los párrafos pegados no respetaban sangría ni alineación.
- **Hecho:**
  - El párrafo va primero en el esquema, así que es el bloque por omisión.
  - Enter propio (`src/lib/editor/comandos.ts`): siempre crea un párrafo y no hereda capitular ni datos del impreso. La sangría sigue la convención del libro (sin sangría tras un título, con sangría después). Los versos centrados o a la derecha conservan su alineación.
  - Al pegar desde Word o Google Docs se leen la alineación y la sangría. Los textos centrados o a la derecha nunca llevan sangría, también al mostrarlos.
  - `overflow-wrap: break-word` en lector, impresión y editor.
- **Verificado:** `tsc`, `eslint`, `prettier`; **193 pruebas**; `e2e:panel` **33/33**; `e2e:humo` **43/43**; capturas de lectura e impresión revisadas.

## 2026-11-24 — Panel conectado: acceso con PIN, Importar y revisar, portadas y publicación (ADR 0021)

- **Pedido (Erick):** aplicar lo que había rechazado, entrar con 2 PIN en lugar de correos y "todo ya funcional".
- **Hecho:**
  - Dos cuentas con PIN (Luis Armando, administración; Erick, edición).
  - `crear_obra` / `agregar_pieza` atómicas; imágenes de ensayos publicados legibles; carpeta `impresion` agregada después en migración `000006`.
  - Importador en servidor (`importar.ts`) con propuestas y decisiones de pantalla; biblioteca con portada, estado y publicación; editor con Ctrl+S; ensayos publicados en el inicio y en el lector desde Supabase.
- **Verificado:** `tsc`, `eslint`, `prettier`; **186 pruebas**; **`e2e:panel` 29/29** y **`e2e:humo` 43/43** en navegador real contra Supabase.
- **Pendiente:** ficha de catálogo para libros importados; insertar imágenes nuevas en el editor; alojar el panel en internet; pasar a correos reales cuando se decida.

## 2026-11-24 — Supabase: esquema del panel aplicado (ADR 0020)

- **Aplicado:** `supabase/migrations/20261124000001_esquema_panel.sql` a `…0005` (tablas, RLS, publicar solo administración, versiones inmutables, historial y buckets; ampliado con `…0006_carpeta_impresion.sql`).
