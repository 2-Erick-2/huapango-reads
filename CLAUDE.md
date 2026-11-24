# CLAUDE.md

Lee primero **`AGENTS.md`**: es la fuente única de contexto, comandos y reglas de este repo.

Skills del proyecto (se cargan automáticamente en este workspace):

- `huapango-reads`: reglas del proyecto, diseño y catálogo.
- `documentacion-continua`: al empezar, lee `docs/ESTADO.md` y la bitácora; al terminar, actualiza `docs/`.

## Eficiencia de contexto y tokens (para rendir al máximo)

- Lee **solo las 3 entradas más recientes** de `docs/BITACORA.md` (los históricos viejos viven en `docs/BITACORA-archivo.md`; no los leas salvo que necesites contexto antiguo).
- No leas `contenido-privado/`, `public/contenido/` ni `epubs/` completos salvo que trabajes en ingesta o contenido.
- Haz **búsquedas dirigidas** antes de leer archivos largos y lee solo los rangos de líneas necesarios.
- Corre `npm run check` **una sola vez** al terminar tus cambios; evita correr `e2e:humo`, `e2e:panel` o inspeccionar capturas PNG si la tarea no cambió UI ni flujo de navegador.
- Mantén commits pequeños cuando el dueño pida guardar avances, para evitar árboles de trabajo gigantes en `git status` / `git diff`.
