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
- [x] Primer commit y repo privado `2-Erick-2/huapango-reads` en GitHub
- [ ] Deploy en Vercel + CNAME `reads.editorialhuapango.com.mx` (pospuesto por el dueño)
- [ ] Lighthouse ≥ 95 en móvil sobre el deploy
- [ ] Revisión con el cliente y ajustes

## Hito 2 — Cuentas y contenido real

- [ ] Supabase (por MCP): esquema v2 con RLS (libros, autores, colecciones, archivos, compras, ledger de regalías, progreso, subrayados, listas)
- [ ] Login con correo (_magic link_) y Google; perfil creado por trigger
- [ ] Cambiar `src/lib/catalog` de datos locales a Supabase
- [ ] Ingesta Word → EPUB (Pandoc) → validación → Storage privado
- [ ] Evaluar foliate-js con EPUB reales (ADR 0005)
- [ ] Edge Function `get-chapter`: verifica la compra, firma la URL y aplica marca de agua con datos del lector
- [ ] Muestra real de _Nahual_ en el lector
- [ ] Progreso, marcadores y subrayados sincronizados (anclas estables)

## Hito 3 — Pagos y regalías

- [ ] Stripe Checkout en MXN (tarjeta y OXXO)
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

## Después

- App nativa (en Android bloquea capturas), audiolibros, reseñas, recomendaciones, modo offline
- Sonido de página (idea del prototipo), efecto de hoja 3D opcional
