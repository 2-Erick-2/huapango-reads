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
- [ ] Login con correo (_magic link_) y Google; perfil creado por trigger
- [ ] Cambiar `src/lib/catalog` de datos locales a Supabase
- [x] Análisis de los primeros EPUB reales (_El príncipe feliz_, InDesign): no sirven tal cual (`docs/analisis/2026-11-23-epub-el-principe-feliz.md`)
- [x] ADR 0010 aceptado (ingesta → formato canónico de bloques)
- [ ] Minilibros: `kind: "libro" | "complemento"` y `parentSlug` en el catálogo y en Supabase (ADR 0012)
- [ ] UI: ficha con minilibros ligados y créditos reales de _El príncipe feliz_; lector cargando `contenido-privado/el-principe-feliz/taller/libro.json` como muestra real
- [ ] Mandar a la editorial la guía de exportación (`docs/editorial/`) y resolver los datos que no coinciden (traductora, ilustraciones, dirección, permisos digitales)
- [ ] Correr EPUBCheck en local sobre los EPUB recibidos
- [ ] Ingesta EPUB de InDesign / Word → validación → normalizador con mapeo por libro → vista previa en 390/768/1440 → Storage privado (ADR 0010)
- [ ] `ReadableText` con bloques tipados e ids estables; el lector pinta portadillas, capitular, imágenes y ornamentos (ADR 0010)
- [ ] Posición de lectura anclada al bloque visible, en lugar de proporcional (`remapSpread`)
- [ ] ~~Evaluar foliate-js con EPUB reales (ADR 0005)~~: innecesario para libros propios si se acepta el ADR 0010
- [ ] Subir las pruebas de Playwright del demo al repo y al CI
- [ ] Edge Function `get-chapter`: verifica la compra, firma la URL y aplica marca de agua con datos del lector
- [ ] Muestra real de _Nahual_ en el lector
- [ ] Progreso, marcadores y subrayados sincronizados (anclas estables)

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
  - [ ] Capitular.
  - [ ] Libro completo con su perfil.
  - [ ] Preflight comercial.
  - [ ] **Prueba física aprobada.**
- [ ] Fase 1: formato canónico compartido (TS) + importador EPUB de InDesign y Word con mapeo por libro (junto con el Hito 2)
- [ ] Fase 2: editor ProseMirror en Solid, estilos, notas, versiones y rol "editorial"
- [ ] Fase 3: plantillas Typst de 2 colecciones, parámetros editables y vista previa en vivo (evaluar `typst.ts` en WASM)
- [ ] Fase 4: servicio de impresión (contenedor Typst + Ghostscript, cola en Supabase) y preflight propio
- [ ] Fase 5: portadas extendidas por colección (lomo automático, EAN-13 y validación de ppp)
- [ ] Fase 6: exportar EPUB 3 (EPUBCheck en CI) y publicar al lector
- [ ] Fase 7: ajuste fino por párrafo y detector de viudas, huérfanas y ríos
- [ ] Revisión legal de Ghostscript (AGPL) y contrato aparte (alcance, propiedad intelectual)

## Después

- App nativa (en Android bloquea capturas), audiolibros, reseñas, recomendaciones, modo offline
- Sonido de página (idea del prototipo), efecto de hoja 3D opcional
