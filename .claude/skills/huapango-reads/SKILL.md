---
name: huapango-reads
description: Contexto, reglas y estándares del proyecto Huapango +reads (plataforma de lectura estilo Netflix de Editorial Huapango, repo huapango-reads, subdominio reads.editorialhuapango.com.mx). Úsala SIEMPRE que se trabaje, planee, diseñe o revise algo de Huapango +reads, el motor de lectura, el catálogo digital, los pagos/regalías de libros o el repo huapango-reads / huapangoread, aunque el usuario no lo pida explícitamente.
---

# Huapango +reads

Plataforma de lectura digital de **Editorial Huapango** (Cd. Reynosa, Tamaulipas): inicio estilo Netflix con el catálogo, fichas de libro, compra por libro y un motor de lectura protegido.

## Reglas que no se negocian

1. **Separación total de la landing.** La landing (`editorialhuapangolanding`, Vite + Tailwind, `editorialhuapango.com.mx`) y +reads son proyectos, repos y deploys distintos. Nunca importes código de uno en otro. Lo único compartido es la identidad visual: los tokens se **copian** (ver `references/diseno.md`) y los assets (logos, portadas) se copian al repo de +reads.
2. **Stack: SolidStart** (Solid, TypeScript estricto). Páginas públicas (inicio, ficha de libro, autor, colección) con SSR para SEO; el lector es 100 % cliente. No uses React ni patrones de React (useEffect, re-renders): usa signals, `createResource`, `createAsync`/`query` y el router de SolidStart. Verifica versiones actuales antes de instalar y fija versiones exactas.
3. **Identidad visual de la landing**, en modo oscuro (dark-first): carbón, bond, terregal y ocre; Newsreader + Plus Jakarta Sans autoalojadas; logo "Huapango" en SVG. Detalle exacto en `references/diseno.md`. No metas paletas, fuentes ni íconos ajenos.
4. **Nunca inventes datos.** Usa solo el catálogo real (`references/catalogo.md`). Sin ISBN, premios, citas, precios ni autores inventados. Si falta un dato, pon un marcador visible ("Por confirmar") y pregúntalo. Todo texto de muestra va etiquetado como tal.
5. **Honestidad en la protección.** En web **no se pueden bloquear capturas de pantalla**: no lo prometas ni lo escribas en la UI. Lo que sí se hace es entrega por capítulo con URL firmada, marca de agua visible (correo, fecha, ID de compra) e invisible, ocultar el contenido al perder el foco, y sin copiar ni imprimir. Nada de "DRM criptográfico" falso.
6. **Pagos reales solo con Stripe Checkout alojado** (MXN, tarjeta + OXXO). Nunca inputs de tarjeta propios. Los créditos o el acceso nunca se otorgan desde el cliente, solo desde un webhook idempotente.

## Decisiones de negocio ya tomadas

- **Modelo:** pago único por libro, con acceso completo y permanente al libro en la cuenta del lector. No hay suscripción.
- **Regalías:** cada venta escribe un **ledger de regalías** (porcentaje por autor; libros con varios autores se reparten). El pago va por Stripe Connect con "separate charges and transfers"; si Connect no está disponible en México, el mismo ledger genera un reporte mensual para SPEI. El cálculo nunca depende del método de pago.
- **Contenido:** la editorial entrega **Word** con estilos (Título 1 = capítulo). Nosotros lo convertimos a EPUB (Pandoc) en el proceso de ingesta. El demo usa un **paginador propio con columnas CSS** sobre contenido JSON estructurado (ADR 0005). Para EPUB real se evaluará **foliate-js** (guardado en el repo en una versión fija, envuelto en Solid, con anclas CFI) en el Hito 2.
- **Infraestructura:** el repo `huapango-reads` va en el GitHub de Erick (`2-Erick-2`). Backend en Supabase (Auth, Postgres con RLS, Storage privado, Edge Functions) y Stripe; el usuario los conecta por MCP. Trabaja en **modo de prueba** y nunca escribas secretos en el repo. Hosting con pagos: Vercel **Pro** o Cloudflare, porque el plan Hobby de Vercel no permite uso comercial.
- **Dominio:** `reads.editorialhuapango.com.mx`. El DNS lo administra Neubox y el correo usa **Zoho** (MX y SPF): nunca cambies los nameservers; agrega solo el CNAME del subdominio.

## Estándar de calidad (senior)

- **Accesibilidad:** nunca `user-scalable=no`, nunca atrapar el botón "atrás", nunca `preventDefault` global de touch. Modales y drawers con foco gestionado y Escape. Navegación completa con teclado. Respeta `prefers-reduced-motion`. Contraste AA (los textos naranjas pequeños sobre carbón usan `terregal-400`).
- **Rendimiento:** Lighthouse ≥ 95 en móvil. Imágenes WebP con `srcset` y `width`/`height` (CLS = 0). Fuentes autoalojadas, solo subset latino, con preload.
- **SEO** en páginas públicas: canonical, Open Graph 1200×630, JSON-LD (`Book`, `Organization`, `ItemList`), sitemap.
- **Código:** TypeScript estricto, sin `any`. Datos tipados con la misma forma que tendrán en Supabase, para cambiar la fuente sin tocar la UI. Lint, typecheck y build en CI. Vitest para la lógica y Playwright para los flujos.
- **Ortografía RAE** en textos de UI: mayúscula solo inicial en títulos ("Todo lo que puedas imaginar"); unidades "g", no "gr"/"grs".

## Forma de trabajo con el usuario

- Responde en **español**. El usuario es el desarrollador; su cliente es Luis Armando (Editorial Huapango) y manda cambios por WhatsApp con capturas.
- **Antes de cada cambio visual, muestra qué vas a hacer** (vista previa o captura) y espera la confirmación. Cuando pida "exacto como el cliente", aplícalo literal y menciona aparte lo que sugieres.
- **Verifica visualmente** en 4 anchos (1440, 1024, 768 y 390 px) con Chrome headless y comparte las capturas.
- **Haz commit o push solo cuando el usuario lo pida.** El mensaje va en español y con la atribución que indique el sistema.
- Entrega planes por fases o hitos con entregables concretos y pide las decisiones que bloquean el trabajo.

## Documentación (obligatoria)

Sigue siempre la skill **`documentacion-continua`**: al iniciar, lee `AGENTS.md`, `docs/ESTADO.md` y la bitácora; al terminar, actualiza la bitácora, el estado, los ADR y el roadmap. Una tarea sin documentar no está terminada.

## Diseño de referencia

Lienzo de Claude Design (privado del usuario): https://claude.ai/artifact/CpdQ77dtym3sgLXDPW852m, con Inicio, Ficha y Lector en escritorio y en celular. Detalle en `docs/DISENO.md`. Si el diseño cambia en el lienzo, refléjalo en el código y en `docs/DISENO.md`.

## Referencias

- `references/diseno.md`: tokens exactos (colores, fuentes, sombras, logos, patrones de UI).
- `references/catalogo.md`: libros publicados, colecciones y próximos lanzamientos con sus datos reales.
