# Arquitectura — Huapango +reads

## Vista general (Hito 1A)

```
Navegador ──► SolidStart (Nitro) ──► SSR de páginas públicas
                │                     (inicio, ficha: SEO y JSON-LD)
                │
                ├─ src/routes/*            páginas (file-based routing)
                ├─ src/lib/catalog/*       datos del catálogo (hoy locales, async)
                ├─ src/lib/libro, src/lib/contenido   formato canónico y acceso al contenido legible
                └─ src/components/reader   lector 100 % cliente (paginación por columnas)
```

Hoy no hay backend ni base de datos. El catálogo viene de `src/lib/catalog/data.ts` y el texto de los libros de archivos estáticos en `public/contenido/` (generados por el importador).

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

## Contenido: del EPUB al lector (ADR 0016)

```
EPUB(s) de InDesign ─► scripts/ingesta ─► Pieza (formato canónico v1) ─► contenido-privado/<obra>/canonico/   (auditable)
   + mapeo.json         verifica que no se      │                         │
                        perdió texto            └─► npm run contenido:publicar
                                                     ├─ public/contenido/<obra>/{pieza}.json + assets/   (el lector los pide bajo demanda)
                                                     └─ src/lib/contenido/manifests.generated.ts         (qué piezas hay; sin red, también en el servidor)
```

- **Formato canónico** (`src/lib/libro/`): una `Pieza` es una lista de bloques tipados (`heading`, `paragraph`, `byline`, `image`, `spacer`, `ornament`) con id posicional y huella. JSON puro, compartido por importador, lector y futuro editor.
- **Importador** (`scripts/ingesta/`): ZIP seguro → XML estricto → átomos con el estilo resuelto desde el CSS → roles según el mapeo de la obra → corte en piezas por anclas de texto → verificación de integridad. Nada se publica si falla. Guía: [`INGESTA.md`](INGESTA.md).
- **Obra y piezas:** una obra tiene una pieza `libro` y complementos (prólogo, nota, epílogo…) ligados a ella (ADR 0012). El catálogo apunta a la obra con `Book.read`.
- **Servidor:** conoce los manifiestos compilados, así que `/leer/<obra>/<pieza>` responde 404 real si no existe. El texto se descarga en el navegador.

## Motor de lectura (ADR 0005 y 0016)

- **Entrada:** una `Pieza` (bloques). `Blocks.tsx` pinta cada tipo de bloque; todo en `em` para que escale con A−/A+.
- **Render:** un contenedor de alto fijo con `column-width` / `column-gap`, donde cada columna es una página. Se navega desplazando con `translateX` un "paso" (ancho visible + separación). Las imágenes no se parten entre columnas; los adornos nunca quedan solos al final de una página.
- **Medición:** al montar, al cambiar el tamaño (`ResizeObserver`), al cargar las fuentes y al cambiar el tamaño de letra se mide `scrollWidth`. Así salen el total de columnas y pliegos (`pagination.ts`) y la posición de cada título, que alimenta el índice.
- **Posición:** se guarda por pieza como proporción del recorrido (`position.ts`) y se aplica en cada medición hasta que la persona pasa de página. El pie muestra el tiempo que falta, no el número de página (que cambia con la letra).
- **Temas:** los adornos son negros sobre blanco; en tema claro se mezclan con `multiply`, en oscuro se invierten (`Blocks.tsx`).
- **Estado:** signals de Solid (`spread`, `spreads`, `layout`, `settings`, `immersive`, `moved`). Las preferencias se guardan en `localStorage`.
- **Entrada del usuario:** `pointerdown`/`pointerup` para toque y swipe (sin `preventDefault` global) y teclado mientras el lector está montado.

## Panel editorial y taller de imprenta (ADR 0018–0023)

- **Panel (`/panel`):** protegido por `PANEL_ENABLED` (404 en producción/GitHub Pages) y autenticación con PIN vía Supabase Auth (`perfiles`, `equipo_permitido`, RLS por rol `admin`/`editor`).
- **Rutas API de servidor (`src/routes/api/panel/`):**
  - `POST /api/panel/importar`: analiza EPUB de InDesign y construye piezas canónicas (`src/server/importar-epub.ts`).
  - `POST /api/panel/imprimir`: compila el libro completo en Node con Typst WASM (`@myriaddreamin/typst.ts`), capitulares (`droplet`) y fuentes OFL (`src/server/imprenta/`), impone en folleto (`pdf-lib`) si se solicita y respalda el PDF en el bucket privado `impresion`.

## Catálogo en vivo y cuentas de lectores (ADR 0024)

- **Catálogo híbrido (`src/lib/catalog/index.ts`):** combina los libros curados locales (`data.ts`) con los libros publicados en Supabase (`public.obras` con `estado = 'publicada'`). Las portadas sin imagen usan respaldo tipográfico editorial (`BookCover.tsx`); los libros nuevos en nube exponen muestra gratuita de hasta 4 bloques mediante la función `public.muestra_libro`.
- **Cuentas de lectores (`src/lib/lector/cuenta.ts`):** usa el cliente `lector()` (`storageKey: "hr-lector-sesion"`) aislado de `panel()`, soporta registro directo (`supabase/functions/registro-lector` + trigger `al_registrar_lector` hacia `public.lectores`), inicio de sesión con contraseña y **modo invitado** (`hr:invitado`). Las rutas `/entrar` y `/biblioteca` y la marca de agua del lector reflejan el estado real y sincronizan el avance en `public.progreso_lectura`.

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
