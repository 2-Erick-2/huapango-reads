# 0021 — Panel conectado a Supabase: acceso con PIN, "Importar y revisar", portadas y publicación

- **Fecha:** 2026-11-24
- **Estado:** Aceptada (en funcionamiento local; verificado en navegador real contra Supabase)
- **Decide:** Erick ("por ahora no uses correos, solo dame 2 PIN"; "haz todo ya funcional")

## Contexto

Con el esquema de la ADR 0020 aplicado, faltaba que el panel lo usara de verdad: entrar, importar libros desde sus EPUB, subir la portada, guardar versiones y que Dirección publique. Se usan dos cuentas por ahora, sin correos reales:

- **Luis Armando:** administración. Es el único que publica.
- **Erick:** edición.

## Decisión

1. **Acceso con PIN de 8 dígitos.**
   - Dos cuentas de Supabase Auth con un correo interno que no existe (`…@panel.huapango.invalid`). Los PIN se generaron al azar. A la base solo llegó su huella bcrypt, que se calculó en la máquina.
   - La pantalla pregunta "¿Quién eres?" y luego pide el PIN. Los mensajes de error están en lenguaje claro.
   - Los perfiles se crean solos (`equipo_permitido`).
   - Los intentos están limitados por Supabase: tras varios PIN incorrectos pide esperar.
   - Cambiar a correos reales es agregar los correos a `equipo_permitido` y entrar con enlace mágico; el resto no cambia.
2. **"Importar y revisar"** (`/panel/importar`, `src/server/importar-epub.ts`, `src/routes/api/panel/importar.ts`).
   - El servidor reutiliza el importador verificado de `scripts/ingesta/` tal cual: arma un mapeo con las decisiones de pantalla y corre `importarObra`.
   - **Propone:**
     - **Estilos:** cuáles son título, título de capítulo o firma.
     - **Textos:** "Por Mercedes Varela" es firma, "FIN" es cierre.
     - **Imágenes:**
       - "prologo.jpg" es título en imagen;
       - las angostas son divisores;
       - los logos se descartan;
       - la primera grande es portadilla.
     - **Piezas:** dónde empieza cada una (después de cada imagen-título).
   - **La persona corrige con menús:**
     - el papel de cada estilo, texto e imagen;
     - el texto de las imágenes-título y de las tarjetas de capítulo;
     - la descripción para lectores ciegos;
     - **dónde va cada imagen**, porque InDesign exporta algunas fuera de lugar;
     - **dónde empieza cada pieza**, porque un EPUB puede traer el libro completo.
   - Muestra la verificación de integridad, que confirma que no falta texto, y la vista previa completa de cada pieza.
   - Guarda en Supabase:
     - la obra, sus piezas y su versión 1, en una sola operación (`crear_obra`);
     - las imágenes, en la carpeta privada;
     - el EPUB original;
     - la importación con su informe;
     - la **portada**, en la carpeta pública.
3. **Prueba de que la herramienta es fiel.** `src/server/importar-epub.test.ts` exige que las **8 piezas reales** salgan **idénticas** a las publicadas y verificadas:
   - _El príncipe feliz_: propuestas automáticas más un clic, "no incluir" los próximos lanzamientos.
   - _Nahual_: un solo EPUB dividido en 5 piezas, con las imágenes reubicadas.
4. **Biblioteca y editor con la base.**
   - Las obras se listan con portada, estado, versión y palabras.
   - "Guardar versión" (o Ctrl+S) crea una versión inmutable. El borrador local queda como respaldo.
   - Abrir una pieza sin tocarla no marca cambios: se compara contra la forma del editor.
   - Se pueden agregar complementos y subir o cambiar la portada (JPG, PNG o WebP; al menos 400 px de ancho; hasta 10 MB).
   - **Solo administración** publica, publica cambios, retira o borra. El editor ve "La publica Dirección.".
   - Las imágenes privadas se muestran con enlaces temporales de 1 hora.
5. **Ensayos en el sitio sin copiar archivos.**
   - La fila "Ensayos" y el lector (`/leer/<obra>`) leen de Supabase, sin sesión, los ensayos publicados.
   - La RLS solo deja ver los ensayos publicados (y sus imágenes, migración `…0005`).
   - Los libros de pago siguen sin poder leerse desde la base sin la futura función de compra.
6. **Se quitó el modo "obras en el navegador"** (ADR 0019): las obras nuevas se crean directo en la base. `paquete.json` y su publicación por comando se conservan para uso técnico.

## Verificación

- Unitarias: **186**, incluidas las 7 del importador con las 8 piezas reales idénticas.
- Navegador real contra Supabase: **`e2e:panel` 29/29**. Cubre:
  - PIN incorrecto y correcto, y rol visible;
  - editor de la demostración, vista previa e impresión;
  - importar _El príncipe feliz_ con portada, verificación e imágenes;
  - el editor no puede publicar;
  - versión 2 con Ctrl+S;
  - ensayo nuevo;
  - Dirección publica;
  - el ensayo aparece en el inicio y se lee;
  - ensayo inexistente;
  - sin errores de consola.
- **`e2e:humo` 43/43.** La prueba borra al final lo que crea: la base quedó con 0 obras y 0 archivos.
- Avisos de seguridad de Supabase: solo "protección contra contraseñas filtradas" desactivada. Es un ajuste del tablero de Supabase que no aplica a PIN numéricos.

## Consecuencias y pendientes

- **El panel sigue siendo local** (desarrollo o `VITE_PANEL=true`). Ya tiene cuentas y permisos reales. Para usarlo en internet falta alojar el servidor (el importador corre en Node) y revisar límites de tamaño y tiempos.
- **Los libros importados aún no tienen ficha en el catálogo público** (precio, colección, compra). Los ensayos sí se ven y se leen.
- **Imágenes en obras escritas desde cero:** el editor todavía no permite insertar imágenes nuevas; las de una obra importada sí se conservan.
- El historial de la base conserva los registros de las pruebas automáticas (creó, publicó, borró de obras "Prueba …").
- `npm run e2e:panel` necesita `HR_PIN_ADMIN` y `HR_PIN_EDITOR`, y `.env.local`.
