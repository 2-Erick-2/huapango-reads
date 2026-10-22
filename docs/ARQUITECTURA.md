# Arquitectura — Huapango +reads

## Vista general (Hito 1A)

```
Navegador ──► SolidStart (Nitro) ──► SSR de páginas públicas
                │                     (inicio, ficha: SEO y JSON-LD)
                │
                ├─ src/routes/*            páginas (file-based routing)
                ├─ src/lib/catalog/*       datos del catálogo (hoy locales, async)
                └─ src/components/reader   lector 100 % cliente (paginación por columnas)
```

Hoy no hay backend ni base de datos. Todo el contenido es estático o viene de `src/lib/catalog/data.ts`.

## Capas

| Capa            | Carpeta                                    | Regla                                                                                  |
| --------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Rutas           | `src/routes/`                              | Solo composición y carga de datos (`query` + `createAsync`). Sin lógica de negocio     |
| Componentes     | `src/components/{ui,catalog,reader}`       | Presentación y comportamiento de UI. Sin datos codificados a mano                      |
| Dominio / datos | `src/lib/catalog`, `src/lib/reader`        | Tipos, acceso a datos (async) y lógica pura **con pruebas**                            |
| Estilos         | `src/styles/app.css`                       | Tokens en `@theme` (Tailwind v4); componentes CSS mínimos (`book-spine`, `row-scroll`) |
| Sitio           | `src/lib/site.ts`, `components/ui/Seo.tsx` | URL pública y metadatos por página                                                     |

## Flujo de datos

1. La ruta declara `export const route = { preload }`, que llama a una función `query(...)`. El router precarga los datos al pasar el mouse por un enlace.
2. El componente usa `createAsync(() => loadX())`; en SSR los datos se serializan al cliente (seroval).
3. `query` llama a `~/lib/catalog`, la **única puerta** a los datos. En el Hito 2 esas funciones consultarán Supabase.

## Motor de lectura v0 (ADR 0005)

- **Entrada:** `ReadableText` (capítulos → párrafos).
- **Render:** un contenedor de alto fijo con `column-width` / `column-gap`, donde cada columna es una página. Se navega desplazando con `translateX` un "paso" (ancho visible + separación).
- **Medición:** al montar, al cambiar el tamaño (`ResizeObserver`), al cargar las fuentes y al cambiar el tamaño de letra se mide `scrollWidth`. Así salen el total de columnas y pliegos (`pagination.ts`) y la posición de cada capítulo, que alimenta el índice.
- **Estado:** signals de Solid (`spread`, `spreads`, `layout`, `settings`, `immersive`). Las preferencias se guardan en `localStorage`.
- **Entrada del usuario:** `pointerdown`/`pointerup` para toque y swipe (sin `preventDefault` global) y teclado mientras el lector está montado.

## Despliegue (planeado)

- **Vercel:** Nitro genera la salida con el preset automático.
- **Dominio:** `reads.editorialhuapango.com.mx` (CNAME en Neubox; DNS y correo Zoho sin cambios).
- **Pagos (Hito 3):** requieren el plan **Pro** de Vercel o Cloudflare, porque el plan Hobby no permite uso comercial.

## Futuro (Hitos 2 y 3)

```
SolidStart ──► Supabase (Auth, Postgres+RLS, Storage privado, Edge Functions)
      │              └─ get-chapter: verifica compra → URL firmada → marca de agua
      └────► Stripe Checkout ──► webhook ──► compras + ledger de regalías ──► Connect / SPEI
```
