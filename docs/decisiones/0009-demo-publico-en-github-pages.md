# 0009 — Demo público en GitHub Pages con subruta configurable

- **Fecha:** 2026-10-22
- **Estado:** Aceptada
- **Decide:** Erick (dueño)

## Contexto

El dueño quiere mostrarle el demo al cliente con un link, pero todavía **no** quiere usar Vercel. GitHub Pages es gratis en repos públicos, solo sirve archivos estáticos y publica el sitio en una subruta (`/huapango-reads/`).

## Decisión

- **Repo público** y **demo estático en GitHub Pages:** https://2-erick-2.github.io/huapango-reads/
- **Workflow `.github/workflows/pages.yml`:** en cada push a `main` compila con:
  - `NITRO_PRESET=github_pages`: prerender completo siguiendo enlaces, `404.html` y `.nojekyll`.
  - `BASE_PATH=/huapango-reads/`: base de Vite, `baseURL` de Nitro y `base` del router.
  - `VITE_SITE_ORIGIN=https://2-erick-2.github.io`: URLs canónicas y Open Graph.
  - `VITE_NOINDEX=true`: el demo no se indexa en Google.
- **Código independiente de la subruta:** enlaces internos con `<A>` y archivos de `public/` con `asset()` (`src/lib/site.ts`). Sin esas variables, el build normal queda en `/`, con el dominio de producción y SSR.
- **`404.html`** se genera con estado 200 al prerenderizar (Pages lo sirve como 404). En un servidor real, la página 404 responde 404.

## Alternativas consideradas

- **Repo privado + GitHub Pages:** requiere un plan de pago de GitHub.
- **Vercel:** pospuesto por el dueño. Es el destino de producción (SSR + pagos).
- **Solo hacer público el repo:** se vería el código, pero no el demo funcionando.

## Consecuencias

- El repo es visible para cualquiera: nunca subir secretos ni información confidencial. El README aclara que no se concede licencia de uso.
- El demo es estático: cuando haya login y pagos (Hitos 2 y 3) el demo de Pages seguirá siendo solo vitrina, y la app real irá a Vercel.
- Verificado con Playwright sirviendo `.output/public` bajo `/huapango-reads/`: 32/32 pruebas ✅.
