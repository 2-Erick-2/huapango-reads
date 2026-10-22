---
name: documentacion-continua
description: Protocolo obligatorio de documentación del repo huapango-reads. Úsala SIEMPRE al empezar una sesión en este repo (para recuperar contexto) y SIEMPRE antes de terminar cualquier tarea que cambie código, diseño, dependencias, decisiones o planes, para dejar todo documentado y que otra persona o agente de IA pueda continuar sin perder contexto.
---

# Documentación continua (huapango-reads)

Objetivo: que **cualquier agente de IA o persona** pueda abrir este repo y, en menos de 5 minutos, saber qué se ha hecho, qué se está haciendo, qué sigue y por qué se decidió cada cosa. La documentación es parte del entregable: una tarea sin documentar **no está terminada**.

## Al iniciar una sesión (siempre, antes de tocar código)

1. Lee `AGENTS.md` (punto de entrada) y luego `docs/ESTADO.md`.
2. Lee las últimas 3 entradas de `docs/BITACORA.md`.
3. Si la tarea toca algo con decisión previa, lee el ADR correspondiente en `docs/decisiones/`.
4. Carga también la skill `huapango-reads` (reglas del proyecto, diseño y catálogo).

## Al terminar una tarea (siempre, en el mismo cambio que el código)

Actualiza en este orden:

1. **`docs/BITACORA.md`**: nueva entrada **arriba**, con este formato exacto:
   ```
   ## AAAA-MM-DD — Título corto
   **Pedido:** qué pidió el usuario o el cliente (con sus palabras clave).
   **Hecho:** lista de cambios concretos, con rutas de archivo.
   **Verificado:** cómo se comprobó (build, lint, tests, capturas, Lighthouse) y el resultado real. Si algo no se verificó, dilo.
   **Pendiente / siguiente:** qué quedó abierto.
   ```
2. **`docs/ESTADO.md`**: reescribe las secciones afectadas para que reflejen el estado **actual** (no un historial): qué funciona, qué es demo o mock, qué falta, enlaces vivos y bloqueos.
3. **`docs/decisiones/NNNN-titulo.md`**: un ADR nuevo por cada decisión técnica o de negocio no trivial (librería, versión fijada, arquitectura, modelo de datos, servicio externo, trade-off). Usa `docs/decisiones/0000-plantilla.md`. Numeración consecutiva. Nunca edites un ADR aceptado para cambiar la decisión: crea uno nuevo que lo reemplace y marca el viejo como "Reemplazado por NNNN".
4. **`docs/ROADMAP.md`**: marca lo terminado `[x]`, agrega lo nuevo y mueve lo que cambió de prioridad.
5. **`AGENTS.md`**: solo si cambian comandos, estructura de carpetas, convenciones o enlaces clave.
6. **Comentarios en el código**: solo donde el _porqué_ no es obvio. No dupliques en comentarios lo que ya dice la bitácora.

## Reglas de estilo de la documentación

- **Español**, frases cortas, sin relleno. Fechas absolutas (`2026-10-22`), nunca "ayer" ni "la semana pasada".
- **Hechos verificables:** rutas, comandos, versiones exactas y URLs. Distingue claramente entre **real**, **demo/mock** y **por confirmar**.
- **No inventes resultados.** Si algo falló o no se probó, escríbelo así.
- **Nada de secretos:** ni llaves de API, ni tokens, ni contraseñas, ni datos personales de usuarios. Las variables de entorno se documentan por nombre en `.env.example`.
- Cada documento debe poder leerse solo: enlaza a los otros en lugar de copiar su contenido.

## Archivos y su propósito

| Archivo                | Para qué sirve                                                                       | Cuándo se actualiza                             |
| ---------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `AGENTS.md`            | Punto de entrada para cualquier agente: qué es, cómo correrlo, mapa del repo, reglas | Cambia la estructura, los comandos o las reglas |
| `CLAUDE.md`            | Apunta a `AGENTS.md` y a las skills                                                  | Rara vez                                        |
| `docs/ESTADO.md`       | Foto actual del proyecto                                                             | Al final de cada tarea                          |
| `docs/BITACORA.md`     | Historial cronológico (la más reciente arriba)                                       | Al final de cada tarea                          |
| `docs/ROADMAP.md`      | Hitos y tareas con checkboxes                                                        | Al cerrar o agregar tareas                      |
| `docs/ARQUITECTURA.md` | Cómo está construido (capas, datos, flujo)                                           | Cuando cambia la arquitectura                   |
| `docs/decisiones/`     | ADRs numerados                                                                       | Con cada decisión                               |
| `docs/DISENO.md`       | Enlace al lienzo de Claude Design y reglas visuales aplicadas                        | Cuando cambia el diseño                         |

## Checklist antes de decir "listo"

- [ ] Build, lint y typecheck pasan (o el fallo está documentado).
- [ ] La bitácora tiene una entrada nueva con "Verificado" honesto.
- [ ] `ESTADO.md` coincide con la realidad.
- [ ] Las decisiones nuevas tienen su ADR.
- [ ] El roadmap está al día.
- [ ] Le dijiste al usuario qué cambió, qué verificaste y qué sigue.
