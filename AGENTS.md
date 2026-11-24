# AGENTS.md — Huapango +reads

> Punto de entrada para **cualquier agente de IA o persona** que trabaje en este repo.
> Léelo completo antes de tocar código. Después lee `docs/ESTADO.md` y las últimas entradas de `docs/BITACORA.md`.
> **Para retomar el trabajo en local** (rama, archivos privados y siguiente tarea): sección "Para retomar en local" al inicio de `docs/ESTADO.md`.

## Qué es

**Huapango +reads** es la plataforma de lectura digital de **Editorial Huapango** (Cd. Reynosa, Tamaulipas, México): un catálogo estilo Netflix, fichas de libro, compra por libro y un motor de lectura protegido.

- **Producción (planeada):** `https://reads.editorialhuapango.com.mx`
- **Landing de la editorial (otro repo, NO tocar desde aquí):** `https://www.editorialhuapango.com.mx` (repo `2-Erick-2/editorialhuapangolanding`)
- **Diseño de referencia (Claude Design, privado del dueño):** https://claude.ai/artifact/CpdQ77dtym3sgLXDPW852m
- **Repositorio (público):** https://github.com/2-Erick-2/huapango-reads. CI en GitHub Actions; git usa `gh` como credencial solo en este repo (ver bitácora).
- **Demo público (GitHub Pages, no es producción):** https://2-erick-2.github.io/huapango-reads/
- **Dueño técnico:** Erick (GitHub `2-Erick-2`). **Cliente:** Luis Armando Rosado, Editorial Huapango.

## Reglas que no se negocian

Las reglas completas están en las skills del proyecto (se cargan solas en Claude Code; otros agentes deben leerlas):

- `.claude/skills/huapango-reads/SKILL.md`: reglas del proyecto, decisiones de negocio y estándar de calidad.
  - `references/diseno.md`: tokens visuales exactos.
  - `references/catalogo.md`: datos reales del catálogo. **No inventar datos.**
- `.claude/skills/documentacion-continua/SKILL.md`: **protocolo obligatorio de documentación**. Toda tarea termina actualizando `docs/`.

Resumen de las reglas:

1. **Separado de la landing:** no se importa código entre repos; solo se copia la identidad visual.
2. **SolidStart + TypeScript estricto.** Nada de React.
3. **No inventar** precios, ISBN, citas, autores ni premios. Lo desconocido se marca "Por confirmar".
4. **Honestidad en la protección:** en web no se bloquean capturas; no se promete.
5. **Pagos solo con Stripe Checkout alojado**; el acceso se otorga solo desde un webhook.
6. **Accesibilidad:** zoom permitido, teclado completo, sin trampas del botón "atrás".

### Colores: modo día y noche

Las pantallas usan **solo colores con significado** (`bg-fondo`, `text-tinta`, `text-acento`, `border-linea`…; ver `src/styles/app.css` y ADR 0022), nunca la paleta cruda (`bg-carbon-900`, `text-bond-100`…): así funcionan en modo día y noche. La prueba `src/lib/tema.test.ts` lo exige y revisa el contraste. Pruebas de navegador en oscuro: `HR_ESQUEMA=noche`.

### Reglas aprendidas al alternar agentes (Claude Code ↔ Antigravity)

Ver `docs/analisis/2026-11-24-revision-trabajo-antigravity.md`.

- **Nunca rellenes con contenido falso.**
- **Anota todo cambio de credenciales o permisos**, sin escribir los valores.
- **Prueba los flujos de cuentas** con un usuario malicioso simulado.
- **Describe cada verificación** con su comando y su equipo.
- **Presenta los cambios grandes de producto** como decisión a Erick.

### Textos de la interfaz

Los textos visibles (panel y sitio) están en lenguaje de editorial: sin rutas de archivo, comandos, "JSON", "paquete", "Hito", "ADR" ni ids internos. Lo técnico va en `docs/` y en comentarios. Lo pidió el dueño: ellos leen el panel.

## Cómo correrlo

Requiere **Node 24** (`.nvmrc`). Con nvm: `nvm use` (en Windows sin nvm, el binario de nodejs.org: `winget` solo ofrece Node 26).

```bash
npm install
npm run dev          # desarrollo en http://localhost:3000
npm run build        # build de producción (Nitro) en .output/
npm start            # sirve el build (PORT=4300 npm start para otro puerto)
npm run check        # typecheck + lint + tests + build (lo mismo que corre CI)
npm run typecheck | lint | test | format     # en Windows: prettier --check --end-of-line auto .
npm run e2e:humo     # recorrido en un navegador real contra el servidor en http://localhost:4300 (npm start)
npm run e2e:panel    # panel contra Supabase: VITE_PANEL=true en el build, .env.local y HR_PIN_ADMIN / HR_PIN_EDITOR (pídeselos a Erick)
VITE_PANEL=true npm run build     # build con el panel encendido (SOLO local: no tiene cuentas); en `npm run dev` ya está encendido

# Contenido (ver docs/INGESTA.md)
npm run contenido:inspeccionar -- "contenido-privado/<obra>/epub/X.epub" [--bloques]
npm run contenido:importar -- contenido-privado/<obra>/mapeo.json [--sin-escribir]
npm run contenido:publicar     # importa y verifica TODAS las obras y actualiza public/contenido/ y el manifiesto
npm run assets:pdf | assets:portadas     # portadas desde PDF/imagen con un navegador (ADR 0017)

# Simular el demo de GitHub Pages en local (sitio estático bajo /huapango-reads/)
BASE_PATH=/huapango-reads/ NITRO_PRESET=github_pages VITE_SITE_ORIGIN=https://2-erick-2.github.io VITE_NOINDEX=true npm run build
# → .output/public (sirve esa carpeta como /huapango-reads/)
```

No se necesitan variables de entorno en el Hito 1. Para las siguientes, ver `.env.example`.

## Mapa del repo

```
.claude/skills/            Skills del proyecto (reglas, diseño, catálogo, documentación)
docs/
  ESTADO.md                Foto actual: qué funciona, qué es demo y qué falta  ← empieza aquí
  BITACORA.md              Historial reciente (lo más nuevo arriba); archivo antiguo en BITACORA-archivo.md
  ROADMAP.md               Hitos y tareas
  ARQUITECTURA.md          Cómo está construido
  DISENO.md                Diseño de referencia y cómo se aplica
  decisiones/              ADRs numerados (por qué se decidió cada cosa)
  INGESTA.md               Cómo entra un libro nuevo (EPUB → formato canónico → lector). Empieza aquí para contenido
  analisis/                Análisis puntuales con fecha (EPUB recibidos, taller editorial, plan del panel de la editorial…)
  editorial/               Guías para el equipo de la editorial (cómo exportar y entregar libros)
contenido-privado/        Material de la editorial (EPUB, PDF, ilustraciones), mapeo.json y salida auditable (canonico/) por obra. Versionado por decisión del dueño; ver su README.md
scripts/
  ingesta/                 Importador EPUB → formato canónico (TS sobre Node 24) y sus pruebas
  contenido/publicar.ts    Publica las obras a public/contenido/ y genera el manifiesto
  assets/                  Portadas: PDF → PNG y recorte/exportación (con un navegador)
  e2e/                     Pruebas de navegador real: humo.ts (sitio) y panel.ts (editor)
prototipos/
  taller-impresion/        Prueba de concepto Typst → PDF/X (interior y portada). No es producción (ADR 0013)
public/
  books/                   Portadas (JPG 500×720, WebP 500 y 260)
  contenido/               GENERADO por contenido:publicar: piezas JSON e imágenes de cada obra. No editar a mano
  brand/                   Logos SVG copiados de la landing
src/
  app.tsx                  Router y layout raíz
  entry-server.tsx         Documento HTML (lang es-MX, íconos)
  styles/app.css           Tailwind v4 + tokens de la landing (@theme)
  lib/site.ts              URL pública, subruta (BASE_PATH) y helpers asset()/absoluteUrl()
  lib/catalog/             Tipos, datos locales del catálogo y funciones de acceso (async)
  lib/editor/              Esquema de ProseMirror = formato canónico, y su conversión de ida y vuelta (ADR 0018)
  lib/club/                Reseñas del Club de lectura (HOY DE EJEMPLO, detrás de una interfaz async)
  lib/libro/               Formato canónico v1 (tipos, texto, validación). Lo usan el importador, el lector y el futuro editor
  lib/contenido/           Acceso al contenido legible: manifiesto compilado (GENERADO), loadPieza, rutas de lectura
  lib/reader/              Paginación, posición de lectura, preferencias, tipos y texto de demostración
  lib/panel/               Panel conectado a Supabase (sesión PIN, obras, versiones, archivos, URLs firmadas)
  lib/supabase/            Clientes `panel()` y `publico()` de Supabase
  components/ui/           Logo, Button, BotonTema, Stars, Seo
  components/catalog/      Header, footer, portadas, carrusel y filas tipo Netflix
  components/reader/       Motor de lectura sobre bloques (Reader, Blocks, ObraReader, SettingsPanel)
  components/panel/        Panel de la editorial: marco, editor, obras en nube, vista previa e impresión PDF
  routes/                  index · libro/[slug] · leer/demo · leer/[obra] · panel · api/panel/{importar,imprimir} · 404
  server/                  Lógica de servidor Node: importador EPUB (`importar-epub.ts`), auth panel y taller PDF (`imprenta/`)
supabase/migrations/       Esquema SQL, RLS y carpetas de Storage (`originales`, `imagenes`, `portadas`, `impresion`)
```

## Convenciones

- **Idioma:** UI, documentación y commits en español. Ortografía RAE: mayúscula solo inicial en títulos.
- **Datos:** la UI consume solo `~/lib/catalog` y `~/lib/contenido` (funciones async). En el Hito 2 se cambia la implementación por Supabase y `get-chapter` sin tocar componentes.
- **Contenido:** nunca se escribe a mano en `public/contenido/` ni en `manifests.generated.ts`: se genera con `npm run contenido:publicar` y las pruebas verifican que no haya quedado desactualizado. Un texto jamás se corrige en el JSON generado: se corrige en el origen o en el mapeo y se vuelve a importar.
- **Fecha de las entradas de bitácora:** usar el día de trabajo (UTC) de los commits.
- **Rutas y archivos:** enlaces internos siempre con `<A>` del router; archivos de `public/` siempre con `asset("/ruta")`. Así funciona igual en un dominio propio que bajo `/huapango-reads/` (ADR 0009).
- **Estilos:** utilidades de Tailwind con los tokens de `app.css`. Nada de colores ni fuentes fuera de la paleta.
- **Solid:** signals, `createAsync` + `query` para datos, refs con `let el!: HTMLElement`. Lógica pura en `lib/` con pruebas en Vitest.
- **Commits y push:** solo cuando el dueño lo pida.
