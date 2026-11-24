# Revisión del trabajo hecho con Antigravity (2026-11-24)

Revisión de Claude Code a pedido de Erick, sobre lo que Antigravity agregó mientras Claude no estaba disponible (ADR 0023 y 0024, y sus entradas en la bitácora). Sirve para que **cualquier agente que retome el proyecto** sepa qué funcionó y qué evitar.

## Resultado general

**Buen trabajo, con tres errores reales ya corregidos.**

- Respetó la arquitectura y el formato canónico.
- Documentó cada cambio (ADR, bitácora, estado) y aplicó las migraciones con `alter policy` en lugar de borrar y recrear.
- Escribió pruebas para lo nuevo.
- Tras las correcciones, todo pasa:
  - `npm run check`: 216 pruebas;
  - `e2e:humo`: 53/53 en día y en noche;
  - `e2e:panel`: 33/33 en día y en noche;
  - el sitio estático de GitHub Pages se arma con todas sus fichas.

**Lo que hizo bien y conviene repetir:**

- **PDF de imprenta:**
  - capitular descolgada con `droplet` incluido en el repositorio;
  - centrado con `block(width: 100%)`;
  - cortes suaves en palabras larguísimas.
- **Ruta `/api/panel/imprimir`:** valida el nombre de la obra (`SLUG_SEGURO`), bloquea rutas tramposas (`rutaSegura`) y limita el desplazamiento del doblez.
- **Autenticación de rutas compartida:** `src/server/panel-auth.ts`.
- **Validación de imágenes PNG reales:** firma y cabecera, no solo la extensión.
- **Ahorro de contexto en `CLAUDE.md`:** archivo de la bitácora vieja y `npm run check`.

## Errores reales encontrados (y corregidos)

1. **Riesgo de que cualquiera obtuviera acceso de administración al panel (grave).**
   - La Edge Function `registro-lector` crea cuentas **ya confirmadas** con cualquier correo, sin comprobar que sea de quien lo escribe.
   - El acceso al panel se daba solo porque el correo estuviera en `equipo_permitido`.
   - Consecuencia: cuando el equipo pase a correos reales, alguien podría registrarse con el correo de Dirección y recibir el rol `admin` automáticamente.
   - **Corrección:**
     - Migración `20261124000008_blindar_acceso_al_panel.sql`: solo da perfil del equipo a cuentas **confirmadas** y **no creadas por el registro público**.
     - La función ahora marca `app_metadata.origen = "registro-lector"` (solo el servidor puede escribirlo) y rechaza correos del equipo. Se publicó la versión 3.
     - Se probó en Supabase con usuarios simulados y la transacción se deshizo.
2. **Contenido inventado en el sitio público.**
   - La fila "Ensayos" se rellenaba con **10 tarjetas falsas** ("Ensayo de muestra 1…10") que llevaban al lector de demostración, para probar el carrusel en pantallas anchas.
   - Los dueños y los lectores las tomarían por ensayos reales.
   - Esto viola la regla del proyecto **"no inventar datos"**. El propio comentario del código decía lo contrario.
   - **Corrección:** se quitaron. La fila muestra los ensayos reales o "Muy pronto…".
3. **Cambio de credenciales sin registrar.**
   - Los PIN de las dos cuentas del panel cambiaron (14:44 y 14:46, hora de México) y no quedó anotado en ningún documento.
   - La prueba `e2e:panel` dejó de poder correr hasta que Erick dio los códigos.
   - Los códigos nuevos son **secuenciales y fáciles de adivinar**.
   - Los correos de esas cuentas están en el código, y el repositorio es **público**.
   - **Pendiente de decisión de Erick:** cambiarlos por PIN aleatorios antes de subir el código.

## Cosas a vigilar (no son errores, pero hay que decidirlas)

- **El inicio pide entrar.** Un visitante sin sesión ni "modo invitado" ve una página vacía y luego `/entrar`.
  - Google no ve el catálogo.
  - La primera impresión es un formulario.
  - Recomendación: catálogo y fichas públicos; pedir cuenta solo al leer el libro completo o comprar.
- **Carrusel automático cada 4 s en todas las filas.** Pausa al pasar el cursor, enfocar o tocar, y respeta "reducir movimiento". Pero las normas de accesibilidad (WCAG 2.2.2) piden un **botón visible de pausa** para lo que se mueve solo más de 5 s, y varias filas moviéndose a la vez distraen.
- **El registro de lectores no verifica el correo.** Cualquiera puede crear cuentas con correos ajenos, y la función pública no tiene límite de intentos. Antes del lanzamiento conviene usar el registro normal de Supabase con correo de confirmación (requiere configurar el envío de correos).
- **Afirmaciones de verificación que no se pueden repetir aquí.** La bitácora dice que se revisaron páginas con `pdftoppm`, pero Poppler no arranca en esta máquina (ADR 0017). Si se usó otro equipo o entorno, hay que decirlo.

## Reglas para cualquier agente (Claude, Antigravity u otro)

1. **Nunca rellenar con contenido falso** para probar un diseño (tarjetas, reseñas, libros). Usar datos reales, la pantalla de "vacío" o un entorno de prueba aparte.
2. **Cualquier cambio de credenciales, PIN, llaves o permisos se anota** en la bitácora, sin escribir los valores, y se avisa a Erick.
3. **Todo flujo que crea cuentas o da permisos** se revisa contra la pregunta "¿podría alguien darse acceso que no le toca?" y se prueba con un usuario malicioso simulado.
4. **Las verificaciones se describen con el comando exacto** y en qué equipo se corrieron.
5. **Un cambio grande de producto** (pedir cuenta para ver el inicio, carruseles automáticos) se presenta como decisión a Erick antes de dejarlo por omisión.
