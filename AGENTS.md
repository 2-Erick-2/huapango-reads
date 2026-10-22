# AGENTS.md — Huapango +reads

> Punto de entrada para **cualquier agente de IA o persona** que trabaje en este repo.
> Léelo completo antes de tocar código. Después lee `docs/ESTADO.md` y las últimas entradas de `docs/BITACORA.md`.

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

## Cómo correrlo

Requiere **Node 24** (`.nvmrc`). Con nvm: `nvm use`.

```bash
npm install
npm run dev          # desarrollo en http://localhost:3000
npm run build        # build de producción (Nitro) en .output/
npm start            # sirve el build (PORT=4300 npm start para otro puerto)
npm run check        # typecheck + lint + tests + build (lo mismo que corre CI)
npm run typecheck | lint | test | format

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
  BITACORA.md              Historial de cambios (lo más reciente arriba)
  ROADMAP.md               Hitos y tareas
  ARQUITECTURA.md          Cómo está construido
  DISENO.md                Diseño de referencia y cómo se aplica
  decisiones/              ADRs numerados (por qué se decidió cada cosa)
public/
  books/                   Portadas (JPG 500×720, WebP 500 y 260)
  brand/                   Logos SVG copiados de la landing
src/
  app.tsx                  Router y layout raíz
  entry-server.tsx         Documento HTML (lang es-MX, íconos)
  styles/app.css           Tailwind v4 + tokens de la landing (@theme)
  lib/site.ts              URL pública, subruta (BASE_PATH) y helpers asset()/absoluteUrl()
  lib/catalog/             Tipos, datos locales del catálogo y funciones de acceso (async)
  lib/reader/              Paginación, preferencias, tipos y texto de demostración
  components/ui/           Logo, Button, Seo
  components/catalog/      Header, footer, portadas y filas tipo Netflix
  components/reader/       Motor de lectura v0
  routes/                  index (inicio) · libro/[slug] (ficha) · leer/demo (lector) · 404
```

## Convenciones

- **Idioma:** UI, documentación y commits en español. Ortografía RAE: mayúscula solo inicial en títulos.
- **Datos:** la UI consume solo `~/lib/catalog` (funciones async). En el Hito 2 se cambia la implementación por Supabase sin tocar componentes.
- **Rutas y archivos:** enlaces internos siempre con `<A>` del router; archivos de `public/` siempre con `asset("/ruta")`. Así funciona igual en un dominio propio que bajo `/huapango-reads/` (ADR 0009).
- **Estilos:** utilidades de Tailwind con los tokens de `app.css`. Nada de colores ni fuentes fuera de la paleta.
- **Solid:** signals, `createAsync` + `query` para datos, refs con `let el!: HTMLElement`. Lógica pura en `lib/` con pruebas en Vitest.
- **Commits y push:** solo cuando el dueño lo pida.
