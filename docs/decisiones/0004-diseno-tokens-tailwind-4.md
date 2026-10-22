# 0004 — Identidad de la landing en Tailwind v4, dark-first y fuentes autoalojadas

- **Fecha:** 2026-10-22
- **Estado:** Aceptada
- **Decide:** Erick (diseño), recomendación técnica (implementación)

## Contexto

+reads debe tener la identidad de la landing: carbón, bond, terregal y ocre; Newsreader y Plus Jakarta Sans; logo "Huapango". Se busca un estilo minimalista tipo Netflix.

## Decisión

- **Tailwind CSS 4.3.3** (`@tailwindcss/vite`), con los tokens de la landing copiados en `@theme` (`src/styles/app.css`).
- **Dark-first:** fondo `carbon-900`, texto `bond-100`, acento `terregal`. El texto naranja pequeño usa `terregal-400` (contraste 5.5:1, cumple AA).
- **Fuentes autoalojadas** con `@fontsource-variable` (subset latino). Sin Google Fonts.
- **Logo:** `logo-huapango-claro.svg` + "+reads" en Newsreader cursiva.
- **Fuente visual:** el lienzo de Claude Design (`docs/DISENO.md`).

## Alternativas consideradas

- **Tailwind v3, igual que la landing:** más familiar, pero v4 es la versión actual y define los tokens en CSS.
- **Modo claro como base:** se descartó porque una plataforma de lectura tipo Netflix se usa mucho de noche y pone en primer plano las portadas.

## Consecuencias

Los tokens se sincronizan a mano con la landing (ADR 0001).
