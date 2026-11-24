# 0020 — Supabase: esquema del panel, roles y carpetas de archivos

- **Fecha:** 2026-11-24
- **Estado:** Aceptada (esquema aplicado en el proyecto `apxhxjmdrudgrxifmqgs`)
- **Decide:** Erick (aprobó el esquema), con recomendación técnica

## Contexto

El panel guardaba todo en el navegador: no podía llevar imágenes ni portadas, ni compartirse entre personas. Erick creó el proyecto de Supabase y aprobó el esquema propuesto. Roles decididos:

- **Luis Armando (CEO): administrador.** Es el único que publica.
- **Erick: editor.**

## Decisión

Migraciones en `supabase/migrations/` (copia exacta de lo aplicado):

1. **`20261124000001_esquema_panel.sql`**
   - **Equipo:** `equipo_permitido` (correo, nombre, rol; solo la administración la ve) y `perfiles`, que se crean solos al registrarse un correo autorizado, o al autorizar uno ya registrado. **Sin registro libre:** una cuenta sin autorización no ve ni crea nada.
   - **Contenido:**
     - `obras`: libro o ensayo, título, autoría, sinopsis, colección, `portada_ruta` y estado (`borrador`, `publicada`, `retirada`).
     - `piezas`: orden, título, firma, `version_vigente` y `version_publicada`.
     - `versiones`: documento canónico v1 en JSONB. Son **inmutables**, con número consecutivo, y la última guardada pasa a ser la vigente.
     - `archivos` y `importaciones`.
   - **`historial`:** lo escriben solo funciones del servidor. Registra creó, borró, publicó, retiró.
   - **Publicar:** `publicar_obra(obra)` es solo para administración. Exige que toda pieza tenga contenido y copia `version_vigente` a `version_publicada`. Dos triggers impiden que alguien que no administra cambie el estado de una obra o lo publicado de una pieza. Las funciones del servidor, que corren sin usuario, sí pueden.
   - **RLS en todas las tablas:**
     - El equipo lee y escribe.
     - Solo la administración borra obras y archivos.
     - Los anónimos ven solo obras y piezas publicadas, y el **texto solo de ensayos publicados** (gratuitos).
     - El texto de libros de pago no es legible sin la futura función de compra (`get-chapter`).
   - Las funciones de apoyo viven en el esquema `private` (no expuesto por la API), con `security definer` y `search_path` vacío.
2. **`20261124000002_carpetas_de_archivos.sql`:** tres carpetas de Storage.
   - `originales`: privada, 50 MB, EPUB/PDF/DOCX.
   - `imagenes`: privada, 15 MB, JPG/PNG/WebP/GIF. Sin SVG, que puede llevar código.
   - `portadas`: **pública**, 10 MB, JPG/PNG/WebP.
   - El equipo ve, sube y reemplaza en las tres; solo la administración borra.

## Verificación

- **Avisos de seguridad de Supabase: ninguno.**
- **Prueba de reglas** con usuarios simulados dentro de una transacción que se deshizo: perfiles automáticos, editor que guarda versiones pero no publica ni cambia estado ni ve los correos autorizados, cuenta desconocida sin acceso, anónimo sin borradores, administración que publica, historial y lectura anónima del ensayo publicado. Todo correcto.
- **Inmutabilidad de versiones:** la comprobación salió "editable", pero por cómo está escrita la prueba. El editor no tiene permiso de cambio, así que la base ignora el cambio sin error (0 filas). Además, un trigger rechaza cualquier cambio. La prueba corregida no se corrió: Erick la rechazó.
- **Aviso de rendimiento pendiente** (nivel advertencia): dos políticas de lectura por tabla en `obras`, `piezas` y `versiones`. Se propuso unirlas y Erick rechazó esa migración; se puede retomar cuando haya volumen. Los avisos de índices sin usar son normales con la base vacía.

## Consecuencias

- **Faltan los correos** de Luis Armando y Erick para autorizarlos (`equipo_permitido`), y conviene **desactivar el registro libre** en Authentication → Sign In / Providers. Aunque esté activo, una cuenta no autorizada no tiene acceso.
- La llave pública (publishable) va en `.env.local`. La de servicio nunca entra al repositorio ni al navegador.
- **Siguiente:** inicio de sesión del panel y pantalla "Importar y revisar". Después, pasar las obras del navegador a Supabase y llevar _El príncipe feliz_ y _Nahual_ a la base.
- **Plan gratuito:** Supabase pausa el proyecto tras una semana sin uso. Para el lanzamiento conviene el plan Pro.
