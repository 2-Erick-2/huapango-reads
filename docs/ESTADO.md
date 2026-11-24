# Estado actual — Huapango +reads

> Foto del proyecto **hoy**. Se reescribe al final de cada tarea (skill `documentacion-continua`).
> **Última actualización:** 2026-11-24

## Para retomar en local (léelo primero)

1. **Rama de trabajo:** `claude/loving-hamilton-5m2lei`. Hay cambios listos sin commit (incluidos `ADR 0024`, migración `000007`, Edge Function `registro-lector` ya desplegada en Supabase, `/entrar`, `/biblioteca`, catálogo en Supabase, editar ficha, historial restaurable, Tangerine autoalojada, y carrusel con autoplay).
2. **Servidor / acceso rápido en local:**
   - Catálogo / puerta de entrada: `http://localhost:3000/` (redirige a `/entrar` si no hay sesión ni modo invitado).
   - Cuenta lector de prueba ya confirmada en Supabase: `lectordemo@editorialhuapango.com` / `Huapango2026!` (o crear cualquier cuenta nueva al instante en **Registrarse** gracias a la Edge Function `registro-lector`).
   - Panel editorial (`/panel`): Luis Armando `24110001` (Administración), Erick `24110002` (Edición). Obra de prueba del usuario en Supabase: `PruebaBd` (**no borrarla**).
3. **Node 24** (`nvm use`, o `C:\Users\admin\tools\node24` en Windows). Luego:

   ```bash
   npm install
   npm run dev            # http://localhost:3000
   npm run check          # typecheck + lint + 132 pruebas + build (lo mismo que corre CI)
   npm run build && PORT=4300 npm start      # versión de producción en http://localhost:4300
   npm run e2e:humo       # recorrido en un navegador real (Edge/Chrome), escritorio y celular
   ```

4. **Contenido real:** `contenido-privado/<obra>/` (EPUB, PDF, mapeo, salida auditable). Para volver a importar y publicar: `npm run contenido:publicar` (guía: [`INGESTA.md`](INGESTA.md)).
5. **Qué probar a mano:** `/` → _El príncipe feliz_ o _Nahual_ → "Leer ahora"; índice (☰) para saltar entre prólogo, nota, cuento, epílogo y capítulos; A−/A+; los 3 temas; recargar y ver que vuelve a donde te quedaste; celular a 390 px.
6. **Lee, en este orden:** [`INGESTA.md`](INGESTA.md), [ADR 0016](decisiones/0016-formato-canonico-v1-e-importador-en-node.md), [`analisis/2026-11-24-panel-editorial.md`](analisis/2026-11-24-panel-editorial.md) y `analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md`.

## En una frase

**Hito 1A ampliado:** el demo navegable ya **lee dos libros reales completos** (_El príncipe feliz_ y _Nahual_, con su prólogo, nota, epílogo y análisis) sobre un **formato canónico** y un **importador verificado** que demuestra que no se pierde texto. La producción en `reads.editorialhuapango.com.mx` (Vercel) sigue **pospuesta por decisión del dueño**. El repo es **público**: https://github.com/2-Erick-2/huapango-reads.

## Qué funciona (real)

| Pantalla           | Ruta                   | Estado                                                                                                                                                                                                                                                                                                  |
| ------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio             | `/`                    | ✅ Si no hay sesión ni modo invitado, redirige a `/entrar`. Con acceso activo, muestra Hero (Nahual), filas por colección combinando catálogo curado y libros publicados desde `/panel`, "Continúa leyendo", "Ensayos" y "Próximamente" con carruseles en avance automático (pausa al pasar el cursor). |
| Ficha de libro     | `/libro/[slug]`        | ✅ Datos reales (curados o editados desde `/panel`), créditos, piezas de libro/nube, lectura de muestra, enlace al acceso de lectores y colores adaptados a día/noche.                                                                                                                                  |
| Acceso de lectores | `/entrar`              | ✅ Iniciar sesión con correo y contraseña, **registrarse al instante** (Edge Function `registro-lector` + perfil automático en `lectores`) y **modo invitado** sin registro, adaptable a móvil, tablet y escritorio.                                                                                    |
| Mi biblioteca      | `/biblioteca`          | ✅ Estado de cuenta o invitado, estante "En lectura" con progreso sincronizado (cuenta) o local (invitado) y ensayos gratuitos.                                                                                                                                                                         |
| Lector             | `/leer/[obra]`         | ✅ Libros importados completos, ensayos publicados y **muestras gratuitas de 4 bloques** para libros publicados en el panel; portadilla a página completa con **Tangerine autoalojada**, marca de agua dinámica del lector o invitado, paginación real, A−/A+, gestos, teclado y modo inmersivo.        |
| Lector             | `/leer/[obra]/[pieza]` | ✅ Abre un complemento (prólogo, nota, epílogo…). Piezas inexistentes responden 404 real.                                                                                                                                                                                                               |
| Lector             | `/leer/demo`           | ✅ El texto de demostración, convertido al mismo formato canónico.                                                                                                                                                                                                                                      |
| 404                | cualquier otra ruta    | ✅ Con estado HTTP 404 real.                                                                                                                                                                                                                                                                            |

**Contenido real importado:**

| Obra                | Piezas                                                                                                                                                                  | Palabras | Verificación                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------- |
| _El príncipe feliz_ | El libro (14 min), Prólogo (Mercedes Varela, 2 min), Nota de la traductora (Yarely Campos Servín, 4 min)                                                                |    4,440 | Cuento completo (3,259 palabras; el normalizador viejo daba 2,836).                                                       |
| _Nahual_            | Prólogo (Ángelus), Nota del autor (Luis Armando Rosado Lara), el cuento (44 min, 5 capítulos), Epílogo (Argenis González), Análisis visual de la obra (Eduardo Serrato) |   11,722 | El conteo independiente del XHTML coincide palabra por palabra; las otras 3 exportaciones y el EPUB del cuento coinciden. |

**Calidad verificada el 2026-11-24:** `typecheck`, `lint`, `prettier --check --end-of-line auto`, **216 pruebas unitarias y de integración** en 23 archivos (incluidas contraste AA, validación binaria PNG, combinación de catálogo local/nube, lógica de cuentas/invitado y compilación Typst WASM + `droplet` + márgenes + folleto), `vite build`, `e2e:humo` (**51/51**), `e2e:panel` (**33/33** contra Supabase) y revisión visual multi-pantalla (`1440`, `1024`, `768`, `390` px en día y noche). El build público responde 404 en `/panel` y `/api/panel/*`. **No verificado:** envío real de correo de confirmación en registro público ni pago real (Hito 3), prueba física en impresora, Safari/Firefox, ni Lighthouse del sitio publicado. El workflow de GitHub Pages ya se verificó con las rutas nuevas (2026-11-24).

## Qué es demo o mock (NO real todavía)

- **Compras digitales:** el botón **"Comprar · pronto"** sigue deshabilitado hasta activar pagos (Stripe/OXXO en Hito 3); en `/biblioteca` "Ediciones adquiridas" lo explica sin inventar libros comprados.
- **Club de lectura:** la pantalla existe (calificación, reseñas, caja "Tu reseña se abre al terminar el libro") pero las **reseñas son de ejemplo** (`src/lib/club/`) y lo dice en pantalla. No se puede reseñar todavía. Regla de desbloqueo por definir con la editorial (¿100 % leído?).
- **Audiolibro:** tarjeta "Próximamente"; el botón "Avísame" está deshabilitado hasta habilitar avisos por correo.
- **Contenido completo en demo público:** los libros locales (`public/contenido/`) siguen siendo archivos estáticos para la demostración; los libros nuevos publicados en `/panel` entregan únicamente **muestra gratuita (primeros 4 bloques)** vía RPC `muestra_libro`. La entrega del libro completo tras compra con URL firmada (`get-chapter`) llega en el Hito 3.
- **Portada de _El príncipe feliz_:** la real, recortada de una cubierta extendida de Canva (ADR 0017); si la editorial manda la portada final suelta, se reemplaza sin tocar código.
- **GitHub Pages** sirve una versión estática (prerenderizada) con `noindex`.

## Contenido real recibido

- **_El príncipe feliz_ (2026-11-23):** 3 EPUB de InDesign: el libro y, aparte, el prólogo y la nota (minilibros, [ADR 0012](decisiones/0012-piezas-complementarias-como-minilibros.md)). PDF de imprenta (62 págs.) y PDF de **forros** (cubierta extendida de Canva con la sinopsis oficial y el ISBN impreso 979-8-9961338-4-0).
- **_Nahual_ (2026-11-24):** 4 EPUB. **Tres son el libro completo exportado tres veces** (PROLOGO1, EPILOGO y NOTA DEL AUTOR: mismo texto, distinto título de archivo) y el cuarto (CUENTO) es el cuento más el epílogo. Más la portada y la contraportada en JPG.
- **Cómo entran:** por el importador (ADR 0016), no tal cual. Los EPUB de InDesign traen fuentes ofuscadas, color negro fijo, títulos hechos con imágenes sin texto alternativo, tarjetas de capítulo con el nombre dentro de la imagen y marcas de página a mitad de frase.
- Análisis: `docs/analisis/2026-11-23-epub-el-principe-feliz.md`.
- Guía para que la editorial exporte bien: `docs/editorial/guia-exportar-epub-desde-indesign.md` (aún no se les manda).

## Taller editorial (decidido el 2026-11-23; ADR 0013 y 0014)

Editor completo solo para los libros de Huapango, que exporta PDF de imprenta, EPUB y +reads. Prototipo en `prototipos/taller-impresion/`. **Plan del panel de la editorial:** [`analisis/2026-11-24-panel-editorial.md`](analisis/2026-11-24-panel-editorial.md).

- **PDF real de imprenta analizado** (2026-11-24): `docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md`.
  - **No es PDF/X:** PDF 1.4 con RGB, sin sangrado y 62 páginas.
  - **Imprimen ellos mismos** con "Folleto" de Adobe Acrobat (2 páginas por cara en hojas carta, doblado y engrapado).
  - El taller ya hace esa imposición: `imponer_folleto.py`, ADR 0015.
  - **Decisión (ADR 0014):** salida "compatible" por omisión; PDF/X como opción.
- **Plantilla "Cuentos a todas partes" calibrada** contra ese PDF (Libertinus 14/18, márgenes 70/76 pt, cornisas, apertura en página impar).
- **Pipeline probado:** canónico → Typst → PDF → Ghostscript → PDF/X-3. Portada extendida con lomo automático y EAN-13.
- **Impresión desde el panel (ADR 0023): HECHO en código y Supabase.** Cada obra en `/panel` tiene el botón **"Imprimir (PDF)"** (`ImprimirModal.tsx` → `POST /api/panel/imprimir`): compila en Node con Typst WASM (`@myriaddreamin/typst.ts` 0.7.0), fuentes libres OFL (Libertinus Serif y Tangerine) y capitular descolgada (`droplet`), genera PDF **media carta** (compatible con Adobe Acrobat) o **folleto listo en hojas carta** (`pdf-lib`, con ajuste opcional de doblez), avisa de imágenes < 300 ppp y guarda copia en el bucket privado `impresion` (migración `000006`).
- **Falta:** confirmación física en impresora de la editorial; ornamento de la cornisa y folio en Explora; portada extendida con lomo y EAN-13 en JS; PDF/X en CMYK solo si contratan imprenta externa; papel y calibre.
- **Prototipo de referencia** en `prototipos/taller-impresion/` (Python + Ghostscript para PDF/X-3 y portada).

## Panel de la editorial (conectado a Supabase + modo día/noche; ADR 0018–0023)

- **Acceso y roles (ADR 0020 y 0021):** entrada con PIN (Luis Armando administración, Erick edición) sobre Supabase Auth y RLS. **Solo Dirección** publica, retira o borra obras.
- **Importar y revisar (`/panel/importar`):** sube EPUB(s) de InDesign, revisa estilos/imágenes/piezas, verifica integridad, sube portada y guarda obra + versiones + archivos privados en Supabase.
- **Obras nuevas (`/panel/nuevo`) y editor (`/panel/<obra>/<pieza>`):** ProseMirror sobre el formato canónico, revisión en vivo, **inserción de imágenes PNG reales** (comprobación de firma binaria y aviso `< 300` ppp antes de subir a Supabase, con ajuste de tamaño o borrado), borrador local de respaldo, **Guardar versión (`Ctrl+S`)** con versiones inmutables en Supabase, vista previa completa (**Lectura +reads** e **Impresión media carta**) y exportación PDF para imprimir (**Imprimir (PDF)** con márgenes Clásico Huapango o Compacto).
- **Ensayos publicados:** se leen directo de Supabase en la fila **"Ensayos"** del inicio y en `/leer/<obra>` (con URLs firmadas para sus imágenes).
- **Apariencia:** **modo día** (paleta de la landing) y **modo noche** automático con selector sol/luna (ADR 0022).
- **Cómo abrirlo:** `npm run dev` y entrar a http://localhost:3000/panel; o compilar con `VITE_PANEL=true`. En cualquier otro build responde 404.
- **Qué falta en el panel:** alojar el panel en internet y pasar de PIN a correos reales cuando se decida. (Ya están implementados: editar datos de catálogo desde `/panel` con `EditarObraModal.tsx` e historial de versiones restaurable con `HistorialModal.tsx`.)

## Por confirmar con la editorial

- **Precio digital** de cada libro (hoy "Precio por confirmar") e **ISBN digital**.
- **Porcentaje de regalías** por autor y autorización de distribución digital.
- **Disponibilidad de Stripe Connect** en México y retenciones fiscales; **CFDI e IVA** de libros electrónicos (contador).
- **_Nahual_:**
  - ¿El **Epílogo** es el cierre narrativo firmado por Argenis González y el **Análisis visual de la obra** el texto de Eduardo Serrato? Se asumió así (cada título aparece junto a su texto en el EPUB). Es una línea de `mapeo.json` si resulta al revés.
  - La última imagen del EPUB (`ChatGPT_Image_28_ene_2026…`, siluetas de pájaros y un árbol) **se ignora**. Su nombre sugiere que es generada con IA: ¿procedencia y uso permitido?
  - ¿Hay capitular en el impreso? (hoy no se usa).
  - Orden de las 5 tarjetas de capítulo: deducido por los nombres de archivo (Jornalero, Media Vida, Alambrado, Rezandera, Zopilotes), que coinciden con las escenas.
  - **La sinopsis de la contraportada no coincide con la del catálogo** (que viene de la landing). Contraportada: "Un ensayo social presentado sobre una historia de terror paródico, relata la llegada de un nahual a un pueblo remoto del norte de México y una serie de asesinatos como consecuencia…". ¿Cuál es la oficial? (El catálogo no se cambió: regla de no inventar.) Las imágenes originales de portada y contraportada están en `contenido-privado/nahual/portadas/`.
- **_El príncipe feliz_:**
  - ¿Ya está publicado? El catálogo muestra "Publicación: Por confirmar" y no tiene enlace de compra del impreso.
  - Autorización digital de la traductora (Yarely Isabel Campos Servín), la prologuista (Mercedes Varela) y el ilustrador (Diego "Neko" Aguilar).
  - ISBN **digital** (el 979-8-9961338-4-0 es del impreso).
  - Si los minilibros son gratis, se venden o vienen incluidos.
  - Erratas del impreso: cornisa "EL PRINCIPE FELIZ" sin tilde; `¨Neko¨` con diéresis en la página legal; en la contraportada "Yarely Campos Servín" y en la página legal "Yarely Isabel Campos Servín".
- Datos de imprenta para el taller (ver `docs/editorial/solicitud-datos-imprenta.md`).

## Bloqueos y siguientes pasos

1. **Publicado en `main` el 2026-11-24 (commit `144b000`)** por decisión de Erick: el demo público ya muestra todo (CI y Pages en verde). **Riesgo aceptado por Erick:** PIN del panel secuenciales con el repo público. Recomendación vigente: cambiarlos por PIN aleatorios.
2. **Siguiente paso:** mostrar la versión actual al cliente, confirmar la prueba física impresa y definir reglas comerciales (precios, pagos con Stripe/OXXO, Club de lectura).
3. **Panel y catálogo conectados (ADR 0020–0024): HECHO.** Acceso editorial con PIN, importación y edición con PNG reales, historial restaurable, edición de datos de ficha pública, publicación en catálogo + muestra segura, Tangerine autoalojada, impresión PDF (media carta / folleto) y cuentas de lectores + modo invitado + Mi biblioteca.
4. **Guardar avances en Git:** cambios en la rama `claude/loving-hamilton-5m2lei` listos para commit atómico cuando el dueño lo pida.
5. **Pedir a la editorial** los datos de imprenta y mandarles la guía de exportación.
6. **Producción (pospuesta por el dueño):** proyecto en Vercel + CNAME `reads` en Neubox, **sin tocar los MX de Zoho ni los nameservers**.

## Riesgos conocidos

- **Repo público con contenido con derechos:** `contenido-privado/` (EPUB, PDF, ilustraciones) y **`public/contenido/`** (el texto completo de las dos obras y sus imágenes, servido por el demo) están en el repo por decisión del dueño. **Hacerlo privado cuanto antes** (en cuenta gratuita, Pages deja de servir el demo; alternativa: Cloudflare Pages). Nunca subir secretos.
- **El texto completo viaja al navegador** de cualquiera que abra el demo: la protección (marca de agua, sin copiar/imprimir) disuade pero no impide. La entrega por capítulo con URL firmada es del Hito 2.
- **Binarios nativos bloqueados en el equipo de desarrollo** (poppler y el canvas de Node no arrancaron; ADR 0017). El importador no los necesita; la conversión de imágenes a WebP tendrá que hacerse con un navegador o en CI.
- **Panel sin autenticación:** el editor de `/panel` no tiene cuentas ni permisos; solo se enciende en desarrollo o con `VITE_PANEL=true`. Publicarlo así dejaría a cualquiera editar (en el navegador) y descargar el contenido.
- **Importador sin cobertura de Word, notas al pie ni tablas** (avisa, no ignora en silencio).
- **`npm audit`:** 4 alertas "high" en una sola cadena (`braces` → `micromatch` → `fast-glob` → `@solidjs/start`), solo de compilación. Se acepta el riesgo y se revisa en cada actualización de SolidStart.
- **Nitro v3 en beta** (ADR 0002). Stack muy nuevo (SolidStart 2, TS 6, Vite 8) para una sola persona.
- **OXXO es asíncrono:** sin manejar `async_payment_succeeded`/`failed`, habría compras pagadas sin acceso.
- **`npm run e2e:humo` no corre en CI todavía** (necesita un servidor y un navegador; hoy se corre a mano).
- **Taller editorial:** compite en tiempo con los Hitos 2 y 3; Ghostscript es AGPL; la imprenta podría rechazar el PDF (por eso la Fase 0); definir la propiedad intelectual del taller en el contrato.
- **Finales de línea:** en Windows (`core.autocrlf=true`) Prettier marca todo si se corre sin `--end-of-line auto`. En CI (Linux) no pasa.

## Enlaces

- **Repositorio (público):** https://github.com/2-Erick-2/huapango-reads
- **Demo (GitHub Pages, versión de `main`):** https://2-erick-2.github.io/huapango-reads/
- **Diseño de las pantallas nuevas (Claude Design, privado del dueño):** https://claude.ai/artifact/A49y1xUCML5JfEVLCcUnve
- **Diseño original (Claude Design):** https://claude.ai/artifact/CpdQ77dtym3sgLXDPW852m
- **Landing de la editorial:** https://www.editorialhuapango.com.mx
- **Prototipo anterior** (React, solo de referencia, NO se usa): carpeta local `~/Desktop/huapangoread`
