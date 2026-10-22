# Diseño — Huapango +reads

## Lienzo de referencia (Claude Design)

https://claude.ai/artifact/CpdQ77dtym3sgLXDPW852m (privado del dueño; para mostrarlo a alguien hay que compartirlo desde el menú Share)

| Pantalla                                  | Archivo en el lienzo  | Ruta en código        |
| ----------------------------------------- | --------------------- | --------------------- |
| Inicio · escritorio (prototipo navegable) | `Main.dc.html`        | `/`                   |
| Ficha de libro · escritorio               | `Libro.dc.html`       | `/libro/[slug]`       |
| Lector (demo) · escritorio, interactivo   | `Lector.dc.html`      | `/leer/demo`          |
| Inicio · celular                          | `InicioMovil.dc.html` | `/` a 390 px          |
| Lector · celular                          | `LectorMovil.dc.html` | `/leer/demo` a 390 px |

Si el lienzo cambia, actualiza el código y esta tabla.

## Principios aplicados

- **Minimalista tipo Netflix, dark-first:** fondo carbón, las portadas como protagonistas y filas horizontales.
- **Identidad de la landing:** paleta bond, carbón, terregal y ocre; Newsreader (títulos y lectura) más Plus Jakarta Sans (UI); logo "Huapango" + "+reads" en cursiva terregal; etiquetas en mayúsculas espaciadas con línea; esquinas `rounded-sm`; lomo en las portadas. Tokens exactos en `.claude/skills/huapango-reads/references/diseno.md`.
- **Sin trucos genéricos de IA:** nada de degradados de fondo, emojis ni tarjetas con borde lateral de color.
- **Accesibilidad:** contraste AA (naranja pequeño = `terregal-400`), objetivos táctiles de 44 px o más, botones y enlaces reales, foco visible y movimiento reducido respetado.

## Diferencias conscientes entre el lienzo y el código

- **Botón "Entrar":** en el código se reemplazó por una insignia "Demo", porque todavía no hay login (Hito 2).
- **Meta de las filas:** muestra el conteo de títulos ("3 títulos") en lugar de descripciones de colección, para no inventar textos.
