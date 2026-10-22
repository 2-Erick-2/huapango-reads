# 0002 — Stack: SolidStart 2.0.6 + Vite 8 + Nitro v3 + Node 24

- **Fecha:** 2026-10-22
- **Estado:** Aceptada
- **Decide:** Erick, con recomendación técnica

## Contexto

El dueño pidió SolidStart. Las páginas públicas (inicio, fichas) necesitan SSR para SEO; el lector es 100 % cliente. Al iniciar, `@solidjs/start@latest` era **2.1.0, publicada el mismo día (2026-10-22)**; la 2.0.6 tenía 2 semanas en producción.

## Decisión

- **`@solidjs/start` 2.0.6**, con versión fija exacta, sobre la plantilla oficial `create-solid --solidstart --v2`.
- **Vite 8.3.5** y **Nitro 3.0.260903-beta** (servidor y presets de deploy), tal como los trae la plantilla oficial v2.
- **Node ≥ 24**, requerido por la plantilla (`.nvmrc` = 24).
- `@solidjs/router` 1.0.0 (`query` + `createAsync` para datos) y `@solidjs/meta` 0.29.4.
- Todas las dependencias con versión exacta (`--save-exact`).

## Alternativas consideradas

- **SolidStart 2.1.0:** más nueva, pero sin tiempo en producción. Se actualizará cuando lleve un tiempo estable.
- **SolidStart 1.x (Vinxi):** estable pero en modo mantenimiento; la v2 es el camino oficial.
- **Solid + Vite (SPA) sin Start:** sin SSR, peor SEO para el catálogo.

## Consecuencias

- **Nitro v3 sigue en beta:** vigilar sus notas de versión al actualizar. En Vercel detecta el preset automáticamente.
- Quien use Node 22 o anterior debe correr `nvm use` (con nvm, sin cambiar su versión global).
