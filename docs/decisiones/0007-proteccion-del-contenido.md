# 0007 — Protección del contenido sin promesas falsas

- **Fecha:** 2026-10-22
- **Estado:** Aceptada
- **Decide:** Erick, con recomendación técnica

## Contexto

El dueño pidió que no se puedan tomar capturas de pantalla y que haya marcas de agua. Los navegadores **no** permiten bloquear capturas ni grabaciones de pantalla. Solo una app nativa de Android puede bloquearlas (`FLAG_SECURE`); iOS solo puede detectarlas.

## Decisión

Lo que sí se hace en web:

- **Marca de agua visible** por página, con el correo del lector, la fecha y el ID de compra. En el demo lleva datos de muestra.
- **Marca de agua invisible por usuario:** Hito 4.
- **Contenido oculto** cuando la pestaña o la app deja de estar visible (`visibilitychange`).
- **Sin copiar** (`copy` cancelado y `user-select: none` en el texto) y **sin imprimir** (`print:hidden`).
- **Entrega por capítulo** con URL firmada de corta duración, solo a quien compró: Hito 2.
- **En la UI nunca se promete "anticapturas" ni "DRM criptográfico".**

No se bloquea el menú contextual ni el zoom, porque son de accesibilidad y no protegen nada real.

## Alternativas consideradas

- **DRM certificado (Readium LCP):** costoso; solo si un autor lo exige.
- **App nativa:** fase posterior; en Android sí bloquea capturas.

## Consecuencias

La protección disuade y permite rastrear filtraciones, pero no las impide. Esto se le comunicó al dueño.
