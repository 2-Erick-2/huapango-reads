/**
 * Prueba de punta a punta del panel de la editorial en un navegador real, contra la base de Supabase.
 * El servidor debe estar compilado con `VITE_PANEL=true` (o correr `npm run dev`) y con `.env.local`.
 *
 *   VITE_PANEL=true npm run build && PORT=4300 npm start           # en otra terminal
 *   HR_PIN_ADMIN=… HR_PIN_EDITOR=… npm run e2e:panel                # BASE_URL=http://localhost:4300
 *
 * Crea obras de prueba con dirección "prueba-e2e-…" y las borra al final (también al empezar, por si
 * una corrida anterior se interrumpió).
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Page } from "playwright-core";
import { buscarNavegador, ESQUEMA, Reporte } from "./comun.ts";

const BASE = process.env["BASE_URL"] ?? "http://localhost:4300";
const CAPTURAS = process.env["HR_CAPTURAS"];
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
const PIN_ADMIN = process.env["HR_PIN_ADMIN"] ?? "";
const PIN_EDITOR = process.env["HR_PIN_EDITOR"] ?? "";
if (!PIN_ADMIN || !PIN_EDITOR) {
  console.error("Faltan HR_PIN_ADMIN y HR_PIN_EDITOR.");
  process.exit(2);
}
const ENV = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => /^\w+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const r = new Reporte();
const LIBRO = "prueba-e2e-principe";
const ENSAYO = "prueba-e2e-ensayo";

const captura = async (page: Page, nombre: string) => {
  if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, `${nombre}.png`), fullPage: true });
};
const palabras = async (page: Page) => Number(await page.getByTestId("palabras").innerText());

/** Borra las obras de prueba y sus archivos con la cuenta de administración. */
async function limpiar() {
  const sb = createClient(
    ENV["VITE_SUPABASE_URL"] ?? "",
    ENV["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
    {
      auth: { persistSession: false },
    },
  );
  const { error } = await sb.auth.signInWithPassword({
    email: "luis-armando@panel.huapango.invalid",
    password: PIN_ADMIN,
  });
  if (error) throw new Error(`No pude entrar como administración: ${error.message}`);
  for (const carpeta of ["portadas", "imagenes", "originales", "impresion"]) {
    for (const obra of [LIBRO, ENSAYO]) {
      const { data } = await sb.storage.from(carpeta).list(obra, { limit: 1000 });
      const rutas = (data ?? []).map((f) => `${obra}/${f.name}`);
      if (rutas.length > 0) await sb.storage.from(carpeta).remove(rutas);
    }
  }
  await sb.from("obras").delete().in("slug", [LIBRO, ENSAYO]);
  await sb.auth.signOut();
}

async function entrarComo(page: Page, nombre: "Luis Armando" | "Erick", pin: string) {
  await page.goto(`${BASE}/panel`);
  await page.getByRole("button", { name: new RegExp(`^${nombre}`) }).click();
  await page.getByLabel(`PIN de ${nombre}`).fill(pin);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("button", { name: "Salir" }).waitFor();
}

async function salirDelPanel(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
  await page.getByText("¿Quién eres?").waitFor();
}

/** Escribe al final del primer o del último párrafo de texto del editor (no en títulos ni firmas). */
async function escribirAlFinal(page: Page, texto: string, cual: "primero" | "ultimo" = "ultimo") {
  await page.locator(".pm-editor .ProseMirror p[data-align]").first().click();
  await page.evaluate((c) => {
    const ps = document.querySelectorAll(".pm-editor .ProseMirror p[data-align]");
    const p = c === "primero" ? ps[0] : ps[ps.length - 1];
    if (!p) return;
    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, cual);
  await page.keyboard.type(texto);
}

/** Pega en el editor como lo haría el portapapeles (HTML de Word/Docs y/o texto plano). */
async function pegar(page: Page, datos: { html?: string; texto: string }) {
  await page.evaluate((d) => {
    const dt = new DataTransfer();
    if (d.html) dt.setData("text/html", d.html);
    dt.setData("text/plain", d.texto);
    document
      .querySelector(".pm-editor .ProseMirror")
      ?.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }),
      );
  }, datos);
}

/** Espera a que todas las imágenes de una zona terminen de cargar; devuelve cuántas cargaron bien. */
async function imagenesCargadas(
  page: Page,
  selector: string,
): Promise<{ total: number; ok: number }> {
  await page
    .waitForFunction(
      (sel) =>
        [...document.querySelectorAll(sel)].every(
          (i) => i instanceof HTMLImageElement && i.complete,
        ),
      selector,
      { timeout: 15_000 },
    )
    .catch(() => null);
  return page.evaluate((sel) => {
    const imgs = [...document.querySelectorAll(sel)];
    return {
      total: imgs.length,
      ok: imgs.filter((i) => i instanceof HTMLImageElement && i.naturalWidth > 0).length,
    };
  }, selector);
}

await limpiar();
const browser = await chromium.launch({ executablePath: buscarNavegador(), headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: ESQUEMA,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text());
  });
  page.on("dialog", (d) => void d.accept());

  // --- Entrar con PIN
  await page.goto(`${BASE}/panel`);
  await page.getByText("¿Quién eres?").waitFor();
  await captura(page, "panel-entrar");
  r.comprobar("sin sesión, el panel pide entrar", await page.getByText("¿Quién eres?").isVisible());
  await page.getByRole("button", { name: /^Erick/ }).click();
  await page.getByLabel("PIN de Erick").fill("12345678");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("alert").waitFor();
  r.comprobar(
    "un PIN incorrecto no entra y lo dice claro",
    (await page.getByRole("alert").innerText()).includes("no es correcto"),
  );
  errores.length = 0; // el 400 del PIN incorrecto es esperado
  await page.getByLabel("PIN de Erick").fill(PIN_EDITOR);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("button", { name: "Salir" }).waitFor();
  r.comprobar(
    "Erick entra con su PIN y ve su rol",
    (await page.locator("header").innerText()).includes("Edición"),
  );

  // --- Libros de la demostración (editor sin base de datos)
  await page.getByRole("link", { name: "Editar" }).filter({ hasText: "Editar" }).first().waitFor();
  await page.goto(`${BASE}/panel/el-principe-feliz/el-principe-feliz-prologo`);
  await page.waitForSelector('[data-testid="sin-problemas"]');
  const editor = page.locator(".pm-editor .ProseMirror");
  r.comprobar(
    "el editor abre el prólogo de la demostración",
    (await editor.innerText()).includes("El Príncipe Feliz es un cuento atemporal"),
  );
  const inicial = await palabras(page);
  await escribirAlFinal(page, " Escribo tres palabras", "primero");
  await page.waitForFunction(
    (n) => Number(document.querySelector('[data-testid="palabras"]')?.textContent) === n,
    inicial + 3,
  );
  r.comprobar("al escribir se actualiza el conteo", (await palabras(page)) === inicial + 3);
  r.comprobar("un párrafo sin punto genera aviso", await page.getByTestId("problemas").isVisible());
  await page.keyboard.type(".");
  await page.waitForSelector('[data-testid="sin-problemas"]');
  await page.waitForTimeout(600);
  await page.keyboard.press("Control+b");
  await page.keyboard.type(" resaltado");
  r.comprobar("la negrita se aplica", (await editor.locator("strong").count()) > 0);
  await page.waitForTimeout(600);
  await page.keyboard.press("Control+z");
  r.comprobar(
    "deshacer quita solo lo último",
    !(await editor.innerText()).includes("resaltado") &&
      (await editor.innerText()).includes("Escribo tres palabras"),
  );
  await page.getByRole("button", { name: "Vista previa completa" }).click();
  await page.waitForSelector('[role="region"][aria-roledescription="lector"]');
  const modal = await page.locator('[data-testid="vista-previa"]').boundingBox();
  r.comprobar(
    "la vista previa ocupa toda la pantalla",
    modal !== null && modal.width >= 1400 && modal.height >= 880,
  );
  await page.getByRole("tab", { name: /Impresión/ }).click();
  await page.waitForSelector('[data-testid="paginas-impresion"]');
  r.comprobar(
    "la vista de impresión compone el texto en hojas",
    (await page.locator('[role="region"][aria-label^="Hojas"]').innerText()).includes(
      "Escribo tres palabras",
    ),
  );
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-testid="vista-previa"]', { state: "detached" });
  await page.waitForTimeout(900);
  await page.reload();
  await page.waitForSelector(".pm-editor .ProseMirror");
  r.comprobar(
    "al recargar se recupera el borrador",
    await page.getByText("Se recuperó un borrador").isVisible(),
  );
  await page.getByRole("button", { name: "Descartar y volver al original" }).click();
  await page.waitForSelector('[data-testid="sin-problemas"]');

  // --- Importar y revisar: El príncipe feliz (3 EPUB) con portada
  await page.goto(`${BASE}/panel/importar`);
  const dir = "contenido-privado/el-principe-feliz/epub";
  await page.setInputFiles("#epub", [
    `${dir}/EL_PRINCIPE_FELIZ_CONTENIDO.epub`,
    `${dir}/EL_PRINCIPE_FELIZ_PROLOGO.epub`,
    `${dir}/EL_PRINCIPE_FELIZ_NOTA_DE_LA_TRADUCTORA.epub`,
  ]);
  await page.locator("#titulo").fill("Prueba El príncipe feliz");
  await page.locator("#autores").fill("Oscar Wilde");
  await page.locator("#direccion").fill(LIBRO);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Armar y revisar" }).waitFor({ timeout: 60_000 });
  await captura(page, "importar-revisar");
  r.comprobar(
    "el análisis propone estilos, imágenes y piezas por archivo",
    (await page.locator("section h2").allInnerTexts()).length === 3 &&
      (await page.getByLabel("Qué es esta imagen").count()) >= 3,
  );
  // Las decisiones que tomaría una persona: no incluir "Próximos lanzamientos" y titular las piezas
  await page.getByLabel("Papel del estilo de «Próximos lanzamientos:»").selectOption("ignorar");
  const titulos = page.getByPlaceholder("Prólogo");
  await titulos.nth(0).fill("Prólogo");
  await titulos.nth(1).fill("Nota de la traductora");
  await page.getByRole("button", { name: "Armar y revisar" }).click();
  await page.getByTestId("resultado-importacion").waitFor({ timeout: 60_000 });
  const resultado = await page.getByTestId("resultado-importacion").innerText();
  r.comprobar(
    "la revisión confirma que no falta texto",
    resultado.includes("Todo en orden"),
    resultado.slice(0, 160),
  );
  const piezasTexto = await page.locator("main").innerText();
  r.comprobar(
    "arma las 3 piezas con sus palabras reales",
    piezasTexto.includes("3,259 palabras") &&
      piezasTexto.includes("357 palabras") &&
      piezasTexto.includes("824 palabras"),
  );
  await page.getByRole("button", { name: "Vista previa" }).nth(1).click();
  await page.waitForSelector('[role="region"][aria-roledescription="lector"]');
  const imgsPrevia = await imagenesCargadas(page, "[data-reader-content] img");
  r.comprobar(
    "la vista previa del prólogo muestra sus imágenes",
    imgsPrevia.total === 2 && imgsPrevia.ok === 2,
    `${imgsPrevia.ok}/${imgsPrevia.total}`,
  );
  await page.keyboard.press("Escape");
  await page.setInputFiles(
    'input[aria-label="Elegir portada"]',
    "public/books/portada-el-principe-feliz.jpg",
  );
  await captura(page, "importar-resultado");
  await page.getByRole("button", { name: "Guardar en la editorial" }).click();
  await page.waitForURL(`${BASE}/panel`, { timeout: 60_000 });
  const tarjeta = page.locator('[data-testid="obra"]', { hasText: "Prueba El príncipe feliz" });
  await tarjeta.waitFor();
  await captura(page, "panel-biblioteca-nube");
  r.comprobar(
    "la obra importada aparece en la biblioteca, en borrador",
    (await tarjeta.innerText()).includes("Borrador"),
  );
  const portadas = await imagenesCargadas(
    page,
    '[data-testid="obra"] img[alt^="Portada de Prueba"]',
  );
  r.comprobar(
    "su portada subida se ve",
    portadas.total === 1 && portadas.ok === 1,
    `${portadas.ok}/${portadas.total}`,
  );
  r.comprobar(
    "como editor no puede publicar",
    (await tarjeta.getByRole("button", { name: "Publicar" }).count()) === 0 &&
      (await tarjeta.innerText()).includes("La publica Dirección."),
  );

  // --- Editar una pieza guardada en la base: versión nueva
  await tarjeta.getByRole("link", { name: "Editar" }).nth(1).click();
  await page.waitForSelector('[data-testid="sin-problemas"]');
  const imgsBase = await imagenesCargadas(page, ".pm-editor img");
  r.comprobar(
    "la pieza abre con sus imágenes desde la base",
    imgsBase.total === 2 && imgsBase.ok === 2,
    `${imgsBase.ok}/${imgsBase.total}`,
  );
  await page.waitForTimeout(500);
  const estadoInicial = await page.getByTestId("estado-guardado").innerText();
  r.comprobar(
    "abre en su versión 1, sin cambios pendientes",
    estadoInicial.includes("Versión 1"),
    estadoInicial,
  );
  await escribirAlFinal(page, " Una corrección.");
  await page.waitForFunction(() =>
    document.querySelector('[data-testid="estado-guardado"]')?.textContent?.includes("sin guardar"),
  );
  await page.keyboard.press("Control+s");
  await page.waitForFunction(() =>
    document.querySelector('[data-testid="estado-guardado"]')?.textContent?.includes("Versión 2"),
  );
  r.comprobar("Ctrl+S guarda la versión 2", true);
  await page.reload();
  await page.waitForSelector(".pm-editor .ProseMirror");
  r.comprobar(
    "al volver a abrir, sale lo guardado",
    (await page.locator(".pm-editor .ProseMirror").innerText()).includes("Una corrección."),
  );

  // --- Nueva obra: un ensayo
  await page.goto(`${BASE}/panel/nuevo`);
  await page.getByLabel("Título", { exact: true }).fill("Prueba ensayo e2e");
  await page.getByLabel("Autoría", { exact: true }).fill("Ana Ruiz");
  await page.locator("#identificador").fill(ENSAYO);
  await page.getByRole("button", { name: "Crear y empezar a escribir" }).click();
  await page.waitForURL(new RegExp(`/panel/${ENSAYO}/${ENSAYO}$`));
  await page.waitForSelector(".pm-editor .ProseMirror");
  // Como escribe una persona: párrafos con Enter, pegar desde Word y texto plano, y una palabra enorme
  await escribirAlFinal(page, "La sombra también es un lugar donde uno aprende a quedarse.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Segundo párrafo escrito a mano, con su punto final.");
  await page.keyboard.press("Enter");
  await pegar(page, {
    html: '<p class="MsoNormal">Pegado desde Word, primero.</p><p class="MsoNormal" style="text-align:center">Pegado desde Word, centrado, con <b>negrita</b> y <i>cursiva</i>.</p>',
    texto: "Pegado desde Word, primero.\nPegado desde Word, centrado, con negrita y cursiva.",
  });
  await page.keyboard.press("Enter");
  await pegar(page, { texto: "Texto plano, línea uno.\nTexto plano, línea dos." });
  await page.keyboard.press("Enter");
  await page.keyboard.type(
    "Palabrasinespaciostanlargaquenocabeenningunacolumnaniaunqueseagrandelapantallaentera.",
  );
  await page.waitForSelector('[data-testid="sin-problemas"]');
  const bloques = await page.evaluate(() =>
    [...(document.querySelector(".pm-editor .ProseMirror")?.children ?? [])].map((e) =>
      e.tagName.toLowerCase(),
    ),
  );
  r.comprobar(
    "Enter y pegar crean párrafos, nunca títulos (solo el título de la obra)",
    bloques.filter((t) => /^h[1-3]$/.test(t)).length === 1 &&
      bloques.filter((t) => t === "p").length === 7,
    bloques.join(","),
  );
  const alineacion = (texto: string) =>
    page.locator(".pm-editor p", { hasText: texto }).first().getAttribute("data-align");
  const pegado = {
    negritas: await page.locator(".pm-editor strong").count(),
    cursivas: await page.locator(".pm-editor em").count(),
    centrado: await alineacion("Pegado desde Word, centrado"),
    normal: await alineacion("Pegado desde Word, primero."),
  };
  r.comprobar(
    "lo pegado de Word conserva negrita, cursiva y su centrado",
    pegado.negritas === 1 &&
      pegado.cursivas === 1 &&
      pegado.centrado === "center" &&
      pegado.normal === "justify",
    JSON.stringify(pegado),
  );

  // Vistas previas: el texto queda dentro de la página, como libro (sin títulos de más)
  await page.getByRole("button", { name: "Vista previa completa" }).click();
  await page.waitForSelector('[role="region"][aria-roledescription="lector"]');
  await page.waitForTimeout(600);
  const lectura = await page.evaluate(() => {
    const zona = document.querySelector('[role="region"][aria-roledescription="lector"]');
    const caja = zona?.getBoundingClientRect();
    const ps = [...document.querySelectorAll("[data-reader-content] p")];
    return {
      titulos: document.querySelectorAll("[data-reader-content] h2").length,
      parrafos: ps.length,
      desbordan: ps.filter((p) => p.scrollWidth > p.clientWidth + 1).length,
      fuera: caja
        ? ps.filter((p) => {
            const r = p.getBoundingClientRect();
            return r.width > 0 && (r.left < caja.left - 1 || r.top > caja.bottom);
          }).length
        : -1,
    };
  });
  r.comprobar(
    "vista de lectura: un solo título y ningún párrafo se sale de la página",
    lectura.titulos === 1 && lectura.parrafos === 7 && lectura.desbordan === 0,
    JSON.stringify(lectura),
  );
  await captura(page, "nueva-obra-lectura");
  await page.getByRole("tab", { name: /Impresión/ }).click();
  await page.waitForSelector("[data-print-flow]");
  await page.waitForTimeout(600);
  const impresion = await page.evaluate(() => {
    const flujo = document.querySelector("[data-print-flow]");
    const ps = [...(flujo?.querySelectorAll("p") ?? [])];
    // Ancho útil de la hoja (sin márgenes): el ancho de columna declarado
    const ancho = flujo ? parseFloat(getComputedStyle(flujo).columnWidth) : 0;
    return {
      ancho: Math.round(ancho),
      desbordan: ps.filter((p) => p.scrollWidth > p.clientWidth + 1).length,
      masAnchos: ps.filter((p) => p.offsetWidth > ancho + 1).length,
    };
  });
  r.comprobar(
    "vista de impresión: el texto cabe en la mancha de la hoja",
    impresion.ancho > 0 && impresion.desbordan === 0 && impresion.masAnchos === 0,
    JSON.stringify(impresion),
  );
  await captura(page, "nueva-obra-impresion");
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-testid="vista-previa"]', { state: "detached" });
  await page.getByRole("button", { name: "Guardar versión" }).click();
  await page.waitForFunction(() =>
    document.querySelector('[data-testid="estado-guardado"]')?.textContent?.includes("Versión 2"),
  );
  r.comprobar("el ensayo nuevo se escribe y se guarda", true);

  // --- Dirección publica
  await page.goto(`${BASE}/panel`);
  await salirDelPanel(page);
  await entrarComo(page, "Luis Armando", PIN_ADMIN);
  r.comprobar(
    "Luis Armando entra como Administración",
    (await page.locator("header").innerText()).includes("Administración"),
  );
  for (const titulo of ["Prueba ensayo e2e", "Prueba El príncipe feliz"]) {
    const t = page.locator('[data-testid="obra"]', { hasText: titulo });
    await t.getByRole("button", { name: "Publicar", exact: true }).click();
    await t.getByText("Publicada", { exact: true }).waitFor();
  }
  r.comprobar("Dirección publica las dos obras", true);
  await captura(page, "panel-publicadas");

  // --- El ensayo publicado aparece en el sitio y se lee
  await page.evaluate(() => localStorage.setItem("hr:invitado", "1"));
  await page.goto(`${BASE}/`);
  await page.locator("#ensayos").getByText("Prueba ensayo e2e").first().waitFor();
  r.comprobar("el ensayo publicado aparece en la fila Ensayos", true);
  await page.locator("#ensayos a", { hasText: "Prueba ensayo e2e" }).click();
  await page.waitForSelector("[data-reader-content]");
  const leido = await page.locator("[data-reader-content]").innerText();
  r.comprobar(
    "y se lee completo en el lector, con lo escrito y lo pegado",
    leido.includes("La sombra también es un lugar") &&
      leido.includes("Pegado desde Word, centrado") &&
      leido.includes("Texto plano, línea dos."),
  );
  await captura(page, "ensayo-en-el-lector");
  const noHay = await page.goto(`${BASE}/leer/prueba-e2e-no-existe`);
  await page.getByText("No encontramos esta lectura").waitFor();
  r.comprobar("un ensayo que no existe lo dice", noHay !== null);

  r.comprobar(
    "sin errores de JavaScript ni de consola",
    errores.filter((e) => !e.includes("404")).length === 0,
    errores.slice(0, 3).join(" | "),
  );
  await context.close();
} finally {
  await browser.close();
  await limpiar();
}
r.cerrar();
