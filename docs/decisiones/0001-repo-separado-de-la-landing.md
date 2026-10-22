# 0001 — Repositorio y deploy separados de la landing

- **Fecha:** 2026-10-22
- **Estado:** Aceptada
- **Decide:** Erick (dueño técnico)

## Contexto

La editorial ya tiene una landing (`editorialhuapangolanding`, Vite + Tailwind v3) en producción en `editorialhuapango.com.mx`. +reads es una aplicación con cuentas, pagos y contenido protegido. Mezclarlas acopla riesgos y despliegues.

## Decisión

+reads vive en su propio repo (`2-Erick-2/huapango-reads`), con su propio deploy en el subdominio `reads.editorialhuapango.com.mx`. Lo único compartido es la **identidad visual**, que se **copia** (tokens, logos y portadas), no se importa. La landing solo enlaza a +reads.

## Alternativas consideradas

- **Monorepo con paquete de tokens compartido:** evita duplicar tokens, pero acopla versiones y CI por un beneficio pequeño (son ~40 valores).
- **+reads dentro de la landing:** imposible sin reescribir la landing; mezcla un sitio estático con una app con backend.

## Consecuencias

- Si cambia la paleta o el catálogo en la landing, hay que actualizar a mano `src/styles/app.css`, `src/lib/catalog/data.ts` y `.claude/skills/huapango-reads/references/`.
- Cada proyecto se despliega y se revierte de forma independiente.
