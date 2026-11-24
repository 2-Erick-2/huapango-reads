# Bitácora — Huapango +reads

> Historial cronológico. **Lo más reciente arriba.** Formato definido en la skill `documentacion-continua`.

## 2026-11-24 — Imprimen en folleto de Acrobat, imposición propia y contenido subido al repo

**Pedido:**

- **La editorial explicó:** "Este lo mando a imprimir en folleto de Adobe… Adobe organiza las páginas para que abarquen media hoja cada una".
- **Erick:** "los archivos sí súbelos tú, no quiero batallar, que todo esté ahí, no importa que sea público, yo lo haré privado después… quiero ya poder pasar a mi máquina local… y seguir desarrollando la UI".

**Hecho:**

- **Sección 0 "Cómo imprimen"** en `docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md`:
  - Impresora propia con "Folleto" de Acrobat en hojas carta.
  - El sangrado no aplica; las 62 páginas se completan a 64.
  - PDF/X no aplica.
  - Riesgo de creep con 16 hojas.
  - Las imágenes a sangre salen con margen blanco.
- **ADR 0015 (Aceptada):** el taller exporta además el folleto impuesto.
- **Nuevo `prototipos/taller-impresion/imponer_folleto.py`** (pypdf): imposición como Acrobat, con relleno a múltiplo de 4 y compensación de creep opcional.
- **Plantillas parametrizadas** para correr desde la raíz del repo: `libro` en `coleccion-cuentos.typ`; `libro` e `ilustracion` en `portada.typ`. Guía rápida reescrita en el README del prototipo.
- **Contenido subido al repo por decisión del dueño** en `contenido-privado/el-principe-feliz/`:
  - EPUB y PDF de imprenta.
  - Folleto impuesto.
  - `libro.json`, fuentes OFL, ilustración y salidas del prototipo.
  - Capturas y reporte JSON.
  - Con su `README.md`.
- **Ignorados nuevos:**
  - `.gitignore` ya no ignora `contenido-privado/`; ignora `prototipos/**/.venv/` y `__pycache__/`.
  - ESLint (`eslint.config.js`) y Prettier (`.prettierignore`) ignoran `contenido-privado` y `prototipos/**/.venv`.
  - El número de teléfono del mensaje de la editorial **no** se guardó.
- **`ESTADO.md` "Para retomar en local" reescrito:** rama, contenido, aviso para hacer el repo privado (y que Pages deja de servir el demo en cuenta gratuita), cómo correr la UI y siguientes tareas de UI.
- Actualizados `AGENTS.md` y el análisis de los EPUB.
- **Corrección de un error propio:** el commit `0a4cea9` dejó **`docs/ROADMAP.md` vacío** (un script abrió el archivo para escribir antes de leerlo). Se restauró desde `b9703dc` y se volvieron a aplicar los cambios del 2026-11-24. Se revisó que no haya otros archivos vacíos.

**Verificado:**

- `imponer_folleto.py` sobre el PDF real: 32 caras = 16 hojas carta (792 × 612 pt). Revisión visual:
  - Hoja 1: 64|1 y 2|63 (blancas).
  - Hoja 16: 34|31 al frente y 32|33 atrás (centro del cuadernillo).
- La guía rápida corre desde la raíz con un venv nuevo (`typst==0.15.2`, pdfplumber, pillow y pypdf): el interior da 23 págs. y la portada de 62 págs. compila.
- `npm run check` y `prettier --check`: ver el resultado en el commit de esta entrada.

**Pendiente / siguiente:**

- **Hacer el repo privado.**
- Pedir a la editorial: modelo de impresora, papel y calibre, forros aparte y engrapado o pegado.
- **En local:** UI (minilibros en la ficha, créditos reales y lector con bloques) y Fase 1 del taller.

## 2026-11-24 — Análisis del PDF real de imprenta de _El príncipe feliz_ y calibración de la plantilla

**Pedido:** "aquí está el PDF que ellos me dieron, que es el que usaron para imprimir. Haz todo el análisis completo, sube todo a GitHub y deja todo listo para irme a seguir desarrollando en local con Claude Code".

**Hecho:**

- **Análisis completo:** `docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md`.
  - **No es PDF/X:** PDF 1.4 de InDesign 21.6 con RGB y transparencias, sin `OutputIntents` y **sin sangrado**.
  - 62 páginas de 5.5 × 8.5 in (no es múltiplo de 4).
  - Imprimen en su propio taller (colofón).
  - Incluye el prólogo y la nota dentro del libro.
  - Especificaciones medidas: Libertinus 14/18, márgenes de 70/76 pt, sangría más línea en blanco, cornisas en versalitas de 8 pt al 78 % K, folio en Explora 14, título en Tangerine 48 y capitular de 69.6 pt.
  - 14 fuentes, 6 comerciales, con propuesta de sustitución.
  - Imágenes: frontispicio a 200 ppp; logo rasterizado en 4 tintas.
  - TAC máximo ≈ 288 %.
  - Erratas: cornisa sin tilde y `¨Neko¨`.
- **Datos resueltos por la página legal:**
  - Traductora **Yarely Isabel Campos Servín**: actualizados `src/lib/catalog/data.ts` y `.claude/skills/huapango-reads/references/catalogo.md`.
  - Ilustrador Diego "Neko" Aguilar.
  - ISBN del impreso 979-8-9961338-4-0 (prefijo de EE. UU.; el digital necesita otro).
- **ADR 0014 (Aceptada):** salida "compatible con su flujo" por omisión y PDF/X como opción.
- **Nuevo** `prototipos/taller-impresion/analizar_pdf_referencia.py`: reporte JSON de cualquier PDF de imprenta. No copia el texto del libro.
- **`coleccion-cuentos.typ` calibrada** contra el impreso, con parámetros `autor`, `titulo` y `guiones`. La división de palabras queda apagada como en su impreso.
- **Documentos actualizados:**
  - `ESTADO.md`: nueva sección "Para retomar en local", taller y por confirmar.
  - `ROADMAP.md` y `AGENTS.md`.
  - Tabla de respuestas en `docs/editorial/solicitud-datos-imprenta.md`.
  - Notas de "resuelto" en la guía y en el análisis de los EPUB.

**Verificado:**

- `analizar_pdf_referencia.py` corrió sobre el PDF real. Los resultados están en el análisis.
- Contacto visual de las 62 páginas y revisión a 50 ppp de las págs. 3–5, 7–9, 11, 13, 27–29, 59, 61 y 62.
- **Comparación** del impreso (págs. 27–29) contra la plantilla Typst: misma caja, cuerpo, interlineado, sangría, espaciado y cornisas.
- **Pendientes de la comparación:**
  - Capitular descolgada.
  - Ornamento de la cornisa.
  - Folio en Explora.
  - Foliado continuo (requiere las preliminares).
- Sin guiones salen espacios grandes, igual que en el impreso. Se recomienda activarlos.
- `npm run check` ✅ (cambió el texto de crédito en `data.ts`).
- El PDF, las capturas y los reportes **no** se subieron (contenido con derechos).

**Pendiente / siguiente:**

- **Pedir a la editorial:**
  - PDF de forros.
  - Papel y calibre.
  - Equipo y armado de pliegos.
  - ISBN digital.
  - Original del frontispicio y logo vectorial.
  - Permisos digitales.
- Avisar de las erratas.
- **En local, Fase 1:** formato canónico en TypeScript + importador EPUB.

## 2026-11-23 — Solicitud de datos a la imprenta

**Pedido:** "¿a qué te refieres con su versión de PDF/X? Les pido eso de una vez para que tú lo analices".

**Hecho:** `docs/editorial/solicitud-datos-imprenta.md` con:

- Explicación corta de PDF/X-1a, X-3 y X-4.
- Mensaje listo para mandar a la imprenta (11 preguntas).
- Lista de lo que hay que pedir a la editorial.
- Tabla para anotar las respuestas.
- **Recomendación clave:** pedir un **PDF ya impreso con éxito** en esa imprenta y el preset `.joboptions` de InDesign. De ahí se obtiene casi toda la configuración sin depender de que la imprenta conteste todo.

- (Ampliado el mismo día) Mensaje para la editorial: pedir el PDF **exacto** enviado a la imprenta (sin volver a exportarlo), el `.joboptions`, el paquete de InDesign (_Archivo → Empaquetar_) y las ilustraciones originales.

**Verificado:** solo documentación; `prettier` OK.

**Pendiente / siguiente:**

- Erick manda el mensaje.
- Cuando lleguen los archivos, guardarlos en `contenido-privado/imprenta/` y pedirle a Claude que analice el PDF de referencia (versión de PDF/X, `OutputIntent`/ICC, cajas, fuentes, tinta) y ajuste el prototipo.

## 2026-11-23 — Minilibros y decisión de construir el taller editorial con PDF de imprenta (prototipo Typst → PDF/X)

**Pedido:**

- **Corrección de Erick:** "solo el EPUB que dice CONTENIDO es el libro". El prólogo y la nota son contenido externo; el prólogo "se presentará como otro minilibro", igual que la nota.
- **Decisión:** "quiero realmente desarrollarles un editor completo solo para sus libros, y que de ahí puedan exportar"; "quiero poder exportar PDF de imprenta correcto"; "analiza bien a fondo, quiero usarte a ti para lograr eso".
- **Pregunta:** ¿las portadas se pueden hacer en la plataforma o hay que usar Affinity?
- También avisó que ya conectó GitHub.

**Hecho:**

- **Push** de la rama `claude/loving-hamilton-5m2lei` (antes fallaba con 403).
- **ADR 0012 (Aceptada):** prólogo y nota como **minilibros** (`kind: "complemento"`, `parentSlug`). Falta saber si son gratis, se venden o vienen incluidos.
- **Correcciones:**
  - El análisis de los EPUB ya no propone unir las partes.
  - La guía de exportación pide un EPUB por obra.
- **ADR 0010:** pasa a **Aceptada**.
- **Investigación (web, 2026-11-23):**
  - Typst 0.15 no exporta PDF/X.
  - Vivliostyle CLI tiene modo _press-ready_ (PDF/X-1a) y es AGPL.
  - Chromium no produce CMYK ni PDF/X.
  - Prince cuesta $3,800 USD por servidor y exige licencia de sitio para uso comercial.
  - Affinity es gratis desde octubre de 2025 y, según reseñas, exporta PDF/X-4; no se confirmó en una página oficial.
- **Prototipo** en `prototipos/taller-impresion/` (solo código; el contenido queda fuera):
  - `normalizar.py`: XHTML de InDesign → `libro.json` con mapeo por libro.
  - `desofuscar_fuentes.py`: fuentes OFL del EPUB.
  - `coleccion-cuentos.typ`: interior de 5.5 × 8.5 in.
  - `portada.typ`: portada extendida con lomo automático, sangrado, marcas de corte y EAN-13 propio.
  - `README.md` con todos los comandos para reproducirlo.
- **Análisis a fondo:** `docs/analisis/2026-11-23-taller-editorial-completo.md`. Incluye arquitectura, editor, plantillas, ajuste fino, PDF/X con preflight, portadas, infraestructura, motores comparados, 8 fases (16 a 26 semanas), riesgos, cómo trabajar con Claude, datos a pedir y negocio.
- **ADR 0013 (Aceptada en lo general):** taller con ProseMirror, plantillas Typst por colección, Ghostscript para PDF/X y servicio de impresión aparte. **Reemplaza al ADR 0011.** El análisis anterior del editor quedó marcado como superado.
- **Actualizados:** `ESTADO.md`, `ROADMAP.md` (sección del taller por fases) y `AGENTS.md` (`prototipos/`).

**Verificado (en el contenedor de la sesión, con Typst 0.15.2 vía PyPI y Ghostscript 10.02.1):**

- **Interior:**
  - 14 páginas de 396 × 612 pt.
  - Libertinus Regular e Italic y Tangerine incrustadas.
  - Separación silábica en español correcta y sin ríos (revisado visualmente en las páginas 1 y 2).
- **PDF/X:**
  - `GTS_PDFXVersion (PDF/X-3:2002)`, `OutputIntents` y `TrimBox` presentes, sin `DeviceRGB`.
  - Con `inkcov`: páginas 1 a 3 con C = M = Y = 0 y K de 3.7 % a 5.9 %.
- **Portada:**
  - 850 × 665 pt, lomo de 1.8 mm (36 págs. × calibre de prueba de 0.1 mm por hoja).
  - Convertida a PDF/X-3 sin RGB.
  - EAN-13 leído con `zbarimg` (`9783161484100`, **ISBN de ejemplo**).
- **Velocidad:**
  - Cuento: 0.04 s.
  - Libro de 131 págs.: 0.40 s.
  - Conversión a PDF/X con Ghostscript: 2.1 s.
- **Problema real detectado:** la ilustración de golondrinas queda a 147 ppp en la portada impresa (se necesitan ~300).
- **No verificado:**
  - Capitular descolgada: no se pudo usar el paquete `droplet` (`packages.typst.org` bloqueado y no se permitió ejecutar el paquete descargado).
  - PDF/X-1a y X-4.
  - Preflight comercial.
  - Perfil ICC real.
  - Prueba física con la imprenta.
- **Gotcha de Ghostscript:** `-dPDFX=3` truena (en 10.02 la opción es booleana: `-dPDFX`). Además, `PDFX_def.ps` debe pasarse con **ruta absoluta**; si no, Ghostscript usa el suyo del sistema y falla con `undefinedfilename`.

**Pendiente / siguiente:**

- **Fase 0:** pedir a la imprenta los datos de PDF/X, ICC, sangrado, tinta, calibre y pliego; resolver la capitular; mandar _El príncipe feliz_ a prueba física.
- Pedir a la editorial las ilustraciones a 300 ppp y los `.indd` o PDF de referencia.
- Confirmar el modelo comercial de los minilibros.
- Revisión legal de Ghostscript (AGPL).
- Cotizar el taller aparte.

## 2026-11-23 — Revisión senior del proyecto, análisis de los EPUB de _El príncipe feliz_ y opinión sobre el "editor tipo InDesign"

**Pedido:**

1. "Analiza este proyecto y dime qué piensas como senior top".
2. Con los 3 EPUB que mandó la editorial (prólogo, nota de la traductora y contenido de _El príncipe feliz_): "dime cómo entrarían en la plataforma para que funcione perfecto en todo tipo de pantallas".
3. Opinión sobre la promesa a los dueños de desarrollarles "un editor como InDesign" en su plataforma para no pagar Adobe.
4. "Todo lo que analices o hagas, documéntalo" para retomarlo en local con Claude Code.

**Hecho (solo documentación, sin cambios de código):**

- **Revisión del proyecto (conclusiones de esta sesión):**
  - **Fortalezas:**
    - Documentación con ADR, reglas de honestidad (no inventar datos, no prometer anticapturas) y la interfaz async del catálogo.
    - Pagos solo por webhook, versiones fijas y CI.
    - Lighthouse de 96 a 100.
  - **Riesgos detectados:**
    - Los bloqueos reales son de negocio (precios, contenido, regalías, revisión del cliente), no de código.
    - Falta la parte fiscal (CFDI e IVA de libros electrónicos; validar con el contador).
    - OXXO es un pago **asíncrono**: el webhook debe manejar `checkout.session.async_payment_succeeded` y `..._failed`, y la UI necesita un estado "pago pendiente".
    - Stack muy nuevo (Nitro 3 beta, SolidStart 2, TS 6, Vite 8) para una sola persona.
    - `remapSpread` conserva la posición de forma proporcional, no anclada.
    - Las pruebas de Playwright (32/32) no están en el repo ni en CI.
    - Colores fijos en `Reader.tsx` (`#D66E53`, `#3A3935`).
    - Un inicio estilo Netflix con 4 libros se ve vacío.
    - `user-select: none` impide buscar en el diccionario.
  - **Pregunta estratégica:** canal propio frente a Kindle, Google o Apple. Se sugiere un modelo híbrido.
  - Las tareas que salen de aquí se agregaron al ROADMAP.
- **Análisis de los EPUB:** [`docs/analisis/2026-11-23-epub-el-principe-feliz.md`](analisis/2026-11-23-epub-el-principe-feliz.md).
  - **Resumen:** EPUB 3 reflujable de InDesign 21.6, en 3 archivos con el mismo nombre de XHTML interno.
  - **Problemas:**
    - Sin encabezados semánticos.
    - Fuentes ofuscadas que el navegador no carga; 3 de ellas comerciales (Monotype Corsiva, Times New Roman y Microsoft Himalaya).
    - `color:#000000` fijo (ilegible en el tema Carbón).
    - La portada es la página 1 rasterizada y la capitular se pierde.
    - Las portadillas con golondrinas se separan del título.
    - Marcas de página impresa a mitad de frase.
    - Párrafos vacíos.
    - `alt=""` en todas las imágenes.
    - Metadatos pobres.
    - Colofón "Impreso en…" con otra dirección.
  - **Veredicto:** no se pueden subir tal cual.
- **ADR 0010 (Propuesta):** ingesta EPUB/Word → formato canónico de bloques tipados con ids estables → lector y EPUB limpio. foliate-js deja de ser necesario para libros propios.
- **Opinión sobre el editor:** [`docs/analisis/2026-11-23-editor-tipo-indesign.md`](analisis/2026-11-23-editor-tipo-indesign.md). Un clon de InDesign no es viable. Se recomienda un "taller editorial" estructurado por fases, después de lanzar +reads y cotizado aparte.
- **ADR 0011 (Propuesta):** alcance del editor.
- **Guía para la editorial:** [`docs/editorial/guia-exportar-epub-desde-indesign.md`](editorial/guia-exportar-epub-desde-indesign.md). Cómo exportar desde InDesign y qué mandar, con las dudas pendientes del libro.
- **`.gitignore`:** se agregó `contenido-privado/` para guardar en local los EPUB y Word de la editorial. **El repo es público: el contenido con derechos nunca se sube.**
- Actualizados `docs/ESTADO.md`, `docs/ROADMAP.md` y `AGENTS.md` (mapa de `docs/`).

**Verificado:**

- Se descomprimieron los 3 EPUB y se revisaron OPF, `encryption.xml`, CSS, XHTML, navegación e imágenes.
- Se renderizaron los XHTML con Chromium (Playwright) a 390 px y 1024 px:
  - Las 9 cargas de fuentes fallan (`OTS parsing error: invalid sfntVersion`).
  - El texto cae a Times.
  - No hay desbordamiento horizontal.
  - La portadilla del prólogo sale como una pantalla de pájaros y el título suelto debajo.
- `pandoc 3.1.3` extrae el texto completo, pero conserva las clases de InDesign.
- **EPUBCheck NO se corrió:** el entorno de la sesión no permitió ejecutar el validador descargado. Pendiente en local.
- Las capturas y los archivos no se subieron al repo (contenido con derechos y repo público).

**Pendiente / siguiente:**

- Erick decide los ADR 0010 y 0011.
- Mandar la guía a la editorial y resolver las dudas:
  - Traductora: "Yarely Campos" en el EPUB contra "Isabel Campos" en el catálogo.
  - Ilustraciones "NEKO".
  - Dirección.
  - Autorización digital.
- Correr EPUBCheck en local.
- Copiar los EPUB a `contenido-privado/` en la máquina de Erick.

## 2026-10-22 — Repo público y demo en GitHub Pages

**Pedido:** "hazlo público en GitHub para poder mostrar la demo". El dueño eligió la opción "Público + GitHub Pages".

**Hecho:**

- **Soporte de subruta** (ADR 0009):
  - `src/lib/site.ts` (`BASE_PATH`, `asset()`, `absoluteUrl()`, `originUrl()`, `NOINDEX`).
  - Router con `base`; portadas, logo e íconos con `asset()`; enlaces internos convertidos a `<A>`.
  - `vite.config.ts`: `base`, `baseURL` de Nitro y prerender cuando `NITRO_PRESET=github_pages`.
- **`src/routes/[...404].tsx`:** responde 200 solo al generar `/404.html` para Pages.
- **`src/vite-env.d.ts`:** tipos de `VITE_SITE_ORIGIN` y `VITE_NOINDEX`.
- **Nuevo workflow `.github/workflows/pages.yml`:** compila el demo estático y lo publica en Pages.
- **Limpieza antes de hacer público:**
  - Se quitó de la documentación el nombre de otra cuenta de GitHub del dueño.
  - El README ahora tiene el link del demo y el aviso de derechos reservados (sin licencia).
- **Repo cambiado a público y Pages activado** con origen "GitHub Actions".
- **Documentación actualizada:** AGENTS, README, ESTADO, ROADMAP y ADR 0009.

**Verificado:**

- `npm run check` ✅ (typecheck, lint, 11 tests y build normal).
- **Build normal sin cambios:** canonical a `reads.editorialhuapango.com.mx`, sin `noindex`, portadas en `/books/…` y 404 real.
- **Build de Pages:** 9 rutas prerenderizadas, más `404.html` y `.nojekyll`; `noindex` y canonical a `2-erick-2.github.io/huapango-reads/…`.
- **Playwright** sirviendo `.output/public` bajo `/huapango-reads/` (escritorio y celular): **32/32 ✅**, 0 imágenes rotas y sin errores de JavaScript.
- **Deploy:**
  - Workflows "CI" y "Demo en GitHub Pages" ✅.
  - En vivo: `/` → 200, las fichas → 301 a la ruta con `/` final (comportamiento normal de Pages) y una ruta inexistente → 404.
  - **Playwright contra el sitio en vivo: 32/32 ✅.**
- **Lighthouse móvil sobre el demo en vivo** (antes de las correcciones):
  - Rendimiento 97 / 96 / 100 (inicio / ficha / lector), CLS 0.
  - SEO 63 a 66 **a propósito** (`noindex`).
  - Caché corta: la impone GitHub Pages.
- **Correcciones de accesibilidad tras Lighthouse:**
  - Enlaces dentro de texto subrayados (pie de página y Mercado Libre).
  - Color de "Capítulo" por tema con contraste AA (`THEMES[].accent`: 5.9 / 5.18 / 5.05).
  - Botones A−/A+ con el texto visible dentro de su nombre accesible.
  - Re-verificado: `npm run check` ✅ y Playwright en la simulación de Pages 32/32 ✅.

**Pendiente / siguiente:** mostrar el demo al cliente; Lighthouse sobre el demo publicado; producción en Vercel cuando el dueño lo autorice.

## 2026-10-22 — Repo privado en GitHub (sin deploy)

**Pedido:** "haz el commit y crea el repo privado, aún no quiero tenerlo en Vercel, por ahora solo en GitHub para poder verlo desde ahí".

**Hecho:**

- Primer commit en la rama `main` con todo el Hito 1A.
- Repo **privado** `2-Erick-2/huapango-reads` creado con `gh` y push de `main`.
- `docs/ESTADO.md` y `docs/ROADMAP.md` actualizados: el deploy queda pospuesto por decisión del dueño.

**Verificado:**

- Antes del commit se revisó que no se incluyeran secretos, `.env`, `node_modules` ni builds.
- Push de `main` OK. **CI de GitHub Actions ✅ en el primer push:** `npm ci`, typecheck, lint, formato, tests y build.

**Notas para otros agentes:**

- Subir workflows (`.github/workflows/`) requiere el permiso `workflow` en `gh`: se hizo `gh auth refresh -s workflow`.
- Si el llavero de git tiene guardada otra cuenta de GitHub, este repo usa la sesión de `gh` (`2-Erick-2`) **solo a nivel local**: `git config --local credential.https://github.com.helper '!gh auth git-credential'`. No se cambió la configuración global para no afectar otros proyectos.

**Pendiente / siguiente:** deploy en Vercel cuando el dueño lo autorice; revisión del demo con el cliente.

## 2026-10-22 — Arranque del proyecto: diseño, base SolidStart, catálogo y lector demo (Hito 1A)

**Pedido:** el dueño pidió un demo para el cliente con "pantalla de inicio estilo Netflix, minimalista", "ficha del libro con ejemplos" usando portadas y datos de la landing, e incluir "el demo del motor de lectura aunque aún no tengamos los Word". También pidió: SolidStart, la identidad visual de la landing, usar Claude Design para las pantallas, documentarlo todo para que otro agente pueda continuar, y que las skills existan **solo en este workspace**. Precio en el demo: opción B, "Precio por confirmar".

**Hecho:**

- **Diseño en Claude Design** (lienzo privado del dueño): https://claude.ai/artifact/CpdQ77dtym3sgLXDPW852m, con 5 pantallas (Inicio, Ficha y Lector en escritorio; Inicio y Lector en celular) y prototipo navegable entre las de escritorio. Detalle en `docs/DISENO.md`.
- **Skills a nivel proyecto:**
  - Se movió `huapango-reads` de `~/.claude/skills/` (global, afectaba todas las sesiones) a `.claude/skills/huapango-reads/`. La copia global quedó en `~/.claude/skills/.trash/` (recuperable).
  - Se creó `.claude/skills/documentacion-continua/` con el protocolo de documentación.
- **Proyecto:**
  - SolidStart 2.0.6 con la plantilla oficial v2, Vite 8.3.5, Nitro 3 beta, Tailwind 4.3.3 y TypeScript 6.0.3, todo con versión fija. Node 24 vía nvm (`.nvmrc`).
  - ESLint (typescript-eslint strict + eslint-plugin-solid), Prettier y Vitest.
  - `npm run check` corre todo.
- **Diseño en código:** tokens de la landing en `src/styles/app.css`, fuentes autoalojadas, logo y portadas copiados a `public/`.
- **Catálogo:** `src/lib/catalog/` con tipos (forma de las tablas futuras), datos reales (4 libros, 5 colecciones, 5 próximos) y funciones async.
- **Pantallas:**
  - `src/routes/index.tsx`: Inicio con hero y filas.
  - `src/routes/libro/[slug].tsx`: ficha con SSR, SEO y 404.
  - `src/routes/leer/demo.tsx`: lector.
  - `src/routes/[...404].tsx`: página no encontrada.
- **Motor de lectura v0:** `src/lib/reader/pagination.ts` y `src/components/reader/Reader.tsx` (ADR 0005), con texto de demostración etiquetado (`src/lib/reader/demo-text.ts`).
- **Documentación:** `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/` (ESTADO, BITACORA, ROADMAP, ARQUITECTURA, DISENO) y ADR 0001 a 0008.
- **CI:** `.github/workflows/ci.yml` (typecheck, lint, formato, tests y build).

**Verificado:**

- `tsc --noEmit` ✅, `eslint .` ✅, `prettier --check` ✅, `vitest` 11/11 ✅, `vite build` ✅.
- Servidor de producción local: `/`, `/libro/nahual`, `/libro/terregal` y `/leer/demo` responden 200; `/libro/no-existe` responde 404.
- **Playwright** (Chrome, en escritorio 1440×900 y celular 390×844), **30/30 ✅**:
  - Navegación de inicio a ficha; el prólogo de Terregal se muestra.
  - En el lector: avanzar y regresar con flechas, A+ repagina (6 → 8 en escritorio y 8 → 11 en celular), toque al centro activa el modo inmersivo y Escape lo cierra, toque a la derecha avanza, el índice salta al capítulo III, las preferencias se guardan y un libro inexistente da 404.
- **Capturas** de las 3 pantallas en 1440, 1024, 768 y 390 revisadas visualmente.
- **Sin errores de JavaScript** en consola, salvo el 404 esperado de la prueba de libro inexistente.
- **No verificado aún:** Lighthouse (se hará con el deploy) y lectores de pantalla reales.

**Pendiente / siguiente:**

- Autorización del dueño para el primer commit y para crear el repo en GitHub.
- Proyecto en Vercel + CNAME `reads` en Neubox.
- Mostrar el demo al cliente.
- Ver los datos por confirmar en `docs/ESTADO.md`.
