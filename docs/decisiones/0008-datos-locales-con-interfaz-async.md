# 0008 — Catálogo local con interfaz async (lista para Supabase)

- **Fecha:** 2026-10-22
- **Estado:** Aceptada (temporal hasta el Hito 2)
- **Decide:** recomendación técnica

## Contexto

El demo necesita datos reales del catálogo antes de tener Supabase.

## Decisión

- Datos en `src/lib/catalog/data.ts`, copiados de la landing. Tipos en `types.ts`, con la forma de las tablas futuras.
- La UI solo usa las funciones **async** de `src/lib/catalog/index.ts` (`getBooks`, `getBook`, `getHomeRows`…), a través de `query` + `createAsync` del router.
- Lo desconocido es `null` y la UI lo muestra como "Por confirmar". Precio digital: "Precio por confirmar" (decisión del dueño, opción B).

## Consecuencias

En el Hito 2 se reemplaza la implementación de esas funciones por consultas a Supabase sin tocar componentes ni rutas. Las pruebas de `catalog.test.ts` cubren el contrato.
