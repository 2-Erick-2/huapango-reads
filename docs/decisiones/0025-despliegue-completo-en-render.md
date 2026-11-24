# 0025 — Despliegue completo en Render (plan gratuito)

- **Fecha:** 2026-11-24
- **Estado:** Aceptada. `render.yaml` está listo; falta que Erick cree el servicio con un clic, porque requiere su cuenta.
- **Decide:** Erick ("escoge el que sea gratis y no me pida muchas cosas")

## Contexto

Erick quiere que el enlace público tenga **todo** lo que hay en local: el panel, importar EPUB y el PDF de imprenta. GitHub Pages solo sirve páginas fijas (ADR 0009), y el panel necesita servidor:

- `POST /api/panel/importar` y `POST /api/panel/imprimir` corren en Node;
- el PDF usa Typst en WebAssembly y lee fuentes y archivos del disco.

## Decisión

- **Render, plan gratuito, servicio web de Node.**
  - Corre la app igual que en local (`npm start` = `node .output/server/index.mjs`).
  - No tiene límite de 4.5 MB por petición, que sí tienen Vercel y Netlify y haría fallar EPUB grandes.
  - Lee los archivos del repositorio desde la raíz: fuentes, motor de Typst y contenido.
- **`render.yaml` (Blueprint).** Lleva todo resuelto: compilación (`npm ci --include=dev && npm run build`), Node 24, panel encendido y conexión pública a Supabase. Erick no tiene que llenar datos: entra con su GitHub en `https://render.com/deploy?repo=https://github.com/2-Erick-2/huapango-reads` y confirma.
- **Se publica solo** con cada cambio en `main`.
- **GitHub Pages sigue igual**, como demo estático de lectura.

## Verificación (simulación local del despliegue)

- Build con las mismas variables de `render.yaml` y servidor en el puerto 10000.
- `/`, `/entrar`, fichas, lector, `/panel` y `/panel/importar` responden 200.
- `POST /api/panel/importar` sin sesión responde 401.
- `e2e:panel` **33/33** (importar El príncipe feliz real, portada, versiones, publicar, ensayo en el inicio) y `e2e:humo` **57/57** contra ese servidor.

## Consecuencias

- **Plan gratuito:** el servicio se duerme tras unos 15 minutos sin visitas; la primera visita después tarda alrededor de un minuto en despertar. Tiene 512 MB de memoria. Para el lanzamiento conviene un plan de pago (Starter, unos 7 USD al mes) o mover a otro proveedor.
- **El panel queda expuesto en internet**, protegido por los PIN. Los PIN actuales son consecutivos y los correos internos están en el código público: **cambiarlos por PIN aleatorios** es más urgente ahora.
- La dirección final la asigna Render (normalmente `https://huapango-reads.onrender.com`). Si cambia, se actualiza `VITE_SITE_ORIGIN` en `render.yaml`.
