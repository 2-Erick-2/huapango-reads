# Roadmap — Huapango +reads

> Hitos y tareas. Marca `[x]` al terminar; agrega tareas nuevas en su hito. Decisiones en `docs/decisiones/`.

## Hito 1A — Demo para el cliente (inicio, ficha y lector de ejemplo)

- [x] Diseño de pantallas en Claude Design (escritorio y celular)
- [x] Proyecto SolidStart con versiones fijas, lint, formato, tests y CI
- [x] Tokens de la landing, fuentes autoalojadas, logo y portadas
- [x] Catálogo local tipado con interfaz async
- [x] Inicio estilo Netflix (hero y filas)
- [x] Ficha de libro con SSR y SEO
- [x] Motor de lectura v0 con texto de demostración
- [x] Documentación completa (AGENTS, ESTADO, BITÁCORA, ROADMAP, ARQUITECTURA, DISEÑO, ADRs)
- [x] Primer commit y repo `2-Erick-2/huapango-reads` en GitHub (público desde 2026-10-22)
- [x] Demo publicado en GitHub Pages: https://2-erick-2.github.io/huapango-reads/ (ADR 0009)
- [ ] Deploy en Vercel + CNAME `reads.editorialhuapango.com.mx` (pospuesto por el dueño)
- [x] Lighthouse ≥ 95 en móvil (rendimiento 96–100 en el demo de GitHub Pages; accesibilidad corregida)
- [ ] Revisión con el cliente y ajustes

## Hito 2 — Cuentas y contenido real

- [ ] Supabase (por MCP): esquema v2 con RLS (libros, autores, colecciones, archivos, compras, ledger de regalías, progreso, subrayados, listas)
- [x] Login de lectores (contraseña, registro y enlace por correo), perfil automático (`lectores`), modo invitado y Mi biblioteca (`ADR 0024`). Falta Google OAuth si se decide habilitar
- [x] Conectar `src/lib/catalog` a Supabase manteniendo catálogo curado como base/respaldo y muestra segura (`muestra_libro`) para libros en nube (`ADR 0024`)
- [x] Análisis de los primeros EPUB reales (_El príncipe feliz_, InDesign): no sirven tal cual (`docs/analisis/2026-11-23-epub-el-principe-feliz.md`)
- [x] ADR 0010 aceptado (ingesta → formato canónico de bloques)
- [x] Minilibros: `kind` (libro/complemento) y `parentSlug` en el formato canónico y el manifiesto (ADR 0012 y 0016); en el catálogo, `Book.read` apunta a la obra. Falta en Supabase
- [x] UI: ficha con piezas ligadas ("Dentro de este libro") y créditos reales de _El príncipe feliz_; lector con el contenido real completo (2026-11-24)
- [ ] Mandar a la editorial la guía de exportación (`docs/editorial/`) y resolver los datos que no coinciden (traductora, ilustraciones, dirección, permisos digitales)
- [ ] Correr EPUBCheck en local sobre los EPUB recibidos
- [x] Ingesta de EPUB de InDesign: importador en Node con mapeo por obra y verificación de integridad (ADR 0016, `docs/INGESTA.md`)
- [ ] Ingesta de Word (.docx), notas al pie y tablas; EPUBCheck del origen; vista previa en 390/768/1440 en el panel; Storage privado
- [x] Bloques tipados con id y huella; el lector pinta títulos, capitular, firmas, imágenes con recorte y ornamentos (ADR 0010 y 0016)
- [x] Posición de lectura recordada por pieza (proporción del recorrido)
- [ ] Posición anclada al bloque visible (por `id`/huella), en lugar de proporcional
- [ ] ~~Evaluar foliate-js con EPUB reales (ADR 0005)~~: innecesario para libros propios si se acepta el ADR 0010
- [x] Prueba de humo en navegador real en el repo (`npm run e2e:humo`, `scripts/e2e/humo.ts`)
- [ ] Correr `e2e:humo` en CI (servidor + navegador)
- [x] **Llevar a código los diseños aprobados** (https://claude.ai/artifact/A49y1xUCML5JfEVLCcUnve):
  - [x] Ficha "libro abierto": resumen arriba, portada con título grande, piezas, audiolibro "Próximamente".
  - [x] Pantalla del Club de lectura con reseñas **de ejemplo**. Falta: reseñas reales, escribir una y la regla de desbloqueo (Hito 2).
  - [x] Inicio con "Continúa leyendo" y **"Ensayos"** gratuitos (ADR 0019), todas las filas con el mismo carrusel y flechas.
  - [x] Panel de ajustes del lector (tamaño, tema, tipografía, interlineado).
  - [x] Portadilla a página completa con el título en Tangerine (autoalojada en `src/styles/fonts/tangerine-regular.ttf`).
- [ ] Conversión de imágenes a WebP con `srcset` en el importador (sin binarios nativos; ADR 0017)
- [ ] Importar `ChatGPT_Image…` de _Nahual_ solo si la editorial confirma procedencia y uso
- [ ] Contenido fuera del repo público: Storage privado + `get-chapter` (ya no `public/contenido/`)- [ ] Edge Function `get-chapter`: verifica la compra, firma la URL y aplica marca de agua con datos del lector
- [x] _Nahual_ completo (5 piezas, 5 capítulos) en el lector
- [x] Progreso sincronizado por usuario en `progreso_lectura` (`src/lib/lector/cuenta.ts`). Faltan marcadores, subrayados y anclas por bloque visible

## Hito 3 — Pagos y regalías

- [ ] Stripe Checkout en MXN (tarjeta y OXXO)
- [ ] OXXO asíncrono: manejar `checkout.session.async_payment_succeeded` / `..._failed` y el estado "pago pendiente" en la UI
- [ ] Facturación (CFDI) e IVA de libros electrónicos: validar con el contador antes de definir el esquema
- [ ] Webhook idempotente: compra → acceso → ledger de regalías
- [ ] Stripe Connect (si está disponible en México) o reporte mensual para SPEI
- [ ] Mi biblioteca, historial de compras y recibos
- [ ] Panel mínimo de ventas y regalías para la editorial

## Hito 4 — Lanzamiento

- [ ] Marca de agua invisible por usuario; límites de uso
- [ ] Tests de punta a punta en CI con Playwright (registro → compra → lectura)
- [ ] Accesibilidad con lector de pantalla, Lighthouse, Sentry y analítica respetuosa
- [ ] Aviso de privacidad (LFPDPPP), términos y política de reembolsos
- [ ] Beta cerrada y apertura

## Taller editorial (decidido, ADR 0013; plan en `docs/analisis/2026-11-23-taller-editorial-completo.md`)

- [x] Prototipo: _El príncipe feliz_ → Typst → PDF/X-3, y portada extendida con lomo y EAN-13 (`prototipos/taller-impresion/`)
- [x] PDF de imprenta real analizado: no es PDF/X; lo imprimen en folleto de Acrobat; plantilla calibrada (`docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md`, ADR 0014)
- [x] Script `analizar_pdf_referencia.py` para sacar especificaciones de cualquier PDF de imprenta
- [x] Imposición en folleto como "Folleto" de Acrobat (`imponer_folleto.py`, ADR 0015)
- [ ] Calibrar el creep y la portada cuando se sepan la impresora y el papel
- [ ] **Fase 0:**
  - [ ] Datos que faltan: PDF de forros, modelo de impresora, papel y calibre, engrapado o pegado.
  - [ ] Cornisa con golondrina y puntos, folio en Explora y páginas preliminares (legal y portadillas).
  - [x] Capitular descolgada (`droplet` en la plantilla Typst del servidor, ADR 0023).
  - [ ] Libro completo con su perfil.
  - [ ] Preflight comercial.
  - [ ] **Prueba física aprobada.**
- [x] Fase 1: formato canónico compartido (TS), importador de EPUB de InDesign con mapeo por obra y plantilla Typst WASM en servidor leyendo el formato canónico v1 (ADR 0016 y 0023). Falta Word (.docx)
- [x] **Panel: obras nuevas, paquete JSON, vista previa completa, conexión a Supabase (PIN, roles, importar y revisar, insertar imágenes PNG en el editor, editar ficha de obra, historial restaurable de versiones, ensayos) y exportación a PDF media carta / folleto (ADR 0019–0024).** Plan en `docs/analisis/2026-11-24-panel-editorial.md`
- [x] Fase 2 (parcial): editor ProseMirror en Solid, versiones inmutables y roles admin/editor en Supabase (ADR 0018, 0020, 0021).
- [x] Fase 3 (parcial): plantilla Typst "Cuentos a todas partes" en WASM (`@myriaddreamin/typst.ts`), imposición en folleto JS (`pdf-lib`) y descarga desde el panel con respaldo en Supabase Storage (`impresion`, ADR 0023). Faltan otras colecciones y parámetros editables en pantalla
- [ ] Fase 4: servicio de impresión (contenedor Typst + Ghostscript, cola en Supabase) y preflight propio
- [ ] Fase 5: portadas extendidas por colección (lomo automático, EAN-13 y validación de ppp)
- [ ] Fase 6: exportar EPUB 3 (EPUBCheck en CI) y publicar al lector
- [ ] Fase 7: ajuste fino por párrafo y detector de viudas, huérfanas y ríos
- [ ] Revisión legal de Ghostscript (AGPL) y contrato aparte (alcance, propiedad intelectual)

## Después

- App nativa (en Android bloquea capturas), audiolibros, reseñas, recomendaciones, modo offline
- Sonido de página (idea del prototipo), efecto de hoja 3D opcional
