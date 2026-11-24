# 0022 — Modo día con la paleta de la landing y modo noche; colores con significado

- **Fecha:** 2026-11-24
- **Estado:** Aceptada (implementada y verificada)
- **Decide:** el dueño, por medio de Erick:
  - le encantó la paleta de la landing y la quiere como modo día;
  - automático según el dispositivo, con un botón sencillo;
  - sin bandas oscuras.

## Contexto

La landing (`2-Erick-2/editorialhuapangolanding`) y +reads ya compartían la paleta (ADR 0004). La diferencia estaba en el uso: la landing es clara (papel bond, carbón y teja oscura), mientras +reads tenía unos 650 colores fijos para fondo oscuro, repartidos en 24 archivos. El análisis completo está en `docs/analisis/2026-11-24-modo-dia-y-pdf-de-imprenta.md`.

## Decisión

1. **Colores con significado** en `src/styles/app.css`:
   - Tailwind 4 `@theme inline` sobre variables `--hr-*`.
   - Nombres: `fondo`, `fondo-hondo`, `superficie`, `superficie-2`, `control`, `control-fuerte`, `linea`, `linea-fuerte`, `borde`, `borde-hover`, `tinta`, `tinta-2`, `tinta-suave`, `tinta-tenue`, `acento`, `acento-borde`, `acento-fondo`, `acento-fondo-hover`, `acento-vivo`, `acento-tenue`, `acento-tenue-borde`, `error`, `aviso`, `aviso-borde`, `foco`.
   - Sombras: `shadow-book*` y `shadow-hoja`.
   - **Noche** es la identidad que ya tenía +reads. **Día** es la de la landing: fondo `#FDFBF7`, tinta `#141413`, acento `#A3452B` y sus sombras cálidas.
2. **Automático por omisión** (`prefers-color-scheme`). El botón sol/luna (`BotonTema`) fija el otro modo con `data-tema` en `<html>` y lo recuerda en el navegador. Si lo elegido coincide con el dispositivo, vuelve a automático. Un script en `<head>` (`SCRIPT_TEMA`) lo aplica antes de pintar, así que no hay parpadeo. `theme-color` va por modo.
3. **Botón** en el sitio, en el lector y en el panel (también en la pantalla de entrar).
4. **Objetos físicos fijos**, iguales en los dos modos: los minilibros de papel (`papel`, `papel-tinta`, `papel-acento`), su listón y la insignia de minutos sobre portadas (`liston`, `liston-tinta`).
5. **Lector.** El marco sigue el modo. La página, sin preferencias guardadas, empieza en Bond (día) o Carbón (noche); después manda lo que elija la persona.
6. **Logo oscuro** en día (`public/brand/logo-huapango.svg`, el mismo dibujo con el carbón de la landing) con la variante `dia:` (`@custom-variant`).
7. **Textura de papel** de la landing (`.textura-papel`) solo en la portada del inicio y solo de día. **Sin bandas oscuras**, por decisión del dueño.
8. **Migración** con `scripts/tema/migrar-colores.ts` (tabla fija, 481 clases) y revisión manual de las excepciones.

## Verificación

- `src/lib/tema.test.ts`:
  - **contraste AA de todos los pares de lectura en los dos modos** (texto ≥ 4.5; bordes de campos ≥ 3; blanco sobre botones);
  - el día automático y el elegido son idénticos;
  - **guardia: ninguna pantalla usa la paleta cruda**;
  - la lógica del botón.
- La prueba de contraste encontró un defecto **que ya existía en noche**: los bordes de los campos tenían 2.62:1. Se subieron a 3.9:1 (`#74736C`).
- Navegador real en **los dos modos del dispositivo** (`HR_ESQUEMA=noche`): `e2e:humo` 51/51 y `e2e:panel` 33/33 en cada uno. Incluyen modo automático, cambio con el botón, que se recuerde al recargar y la vuelta a automático.
- Capturas de inicio, ficha, lector y panel, en escritorio y celular, revisadas en día y en noche.

## Consecuencias

- Regla nueva (`AGENTS.md`): **solo colores con significado** en las pantallas. La prueba de guardia lo exige.
- Pendiente de ver con el dueño en un teléfono real; Safari y Firefox no se verificaron.
