# Bitácora — Huapango +reads

> Historial cronológico. **Lo más reciente arriba.** Formato definido en la skill `documentacion-continua`.

## 2026-10-22 — Repo privado en GitHub (sin deploy)

**Pedido:** "haz el commit y crea el repo privado, aún no quiero tenerlo en Vercel, por ahora solo en GitHub para poder verlo desde ahí".

**Hecho:**

- Primer commit en la rama `main` con todo el Hito 1A.
- Repo **privado** `2-Erick-2/huapango-reads` creado con `gh` y push de `main`.
- `docs/ESTADO.md` y `docs/ROADMAP.md` actualizados: el deploy queda pospuesto por decisión del dueño.

**Verificado:** ver la entrada siguiente (verificación completa del Hito 1A). Antes del commit se revisó que no se incluyeran secretos, `.env`, `node_modules` ni builds (`.gitignore`). El resultado del CI en GitHub Actions se anota en la siguiente entrada.

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
