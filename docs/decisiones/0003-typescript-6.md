# 0003 — TypeScript 6.0.3 (no 7)

- **Fecha:** 2026-10-22
- **Estado:** Aceptada
- **Decide:** recomendación técnica

## Contexto

`typescript@latest` es 7.0.2, pero `typescript-eslint@8.72.0` (linter con reglas de tipos) declara compatibilidad `>=4.8.4 <6.1.0`.

## Decisión

Usar **TypeScript 6.0.3** con `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals` y `noUnusedParameters`.

## Alternativas consideradas

- **TS 7:** más rápido, pero rompe la compatibilidad declarada del linter.
- **Sin typescript-eslint:** se pierden reglas valiosas de calidad.

## Consecuencias

Revisar la migración a TS 7 cuando typescript-eslint la soporte oficialmente.
