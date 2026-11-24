/**
 * Prueba de humo de punta a punta en un navegador real (escritorio y celular).
 *
 *   npm run build && PORT=4300 npm start          # en otra terminal
 *   npm run e2e:humo                              # BASE_URL=http://localhost:4300 por omisión
 *
 * Variables opcionales:
 *   BASE_URL     dirección del servidor (por omisión http://localhost:4300)
 *   HR_BROWSER   ruta al ejecutable de Edge/Chrome/Chromium (si no, se busca uno instalado)
 *   HR_CAPTURAS  carpeta donde guardar capturas de pantalla de cada paso
 *
 * Usa `playwright-core` con el navegador que ya tengas: no descarga nada.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright-core";
import { buscarNavegador, ESQUEMA } from "./comun.ts";

const BASE = process.env["BASE_URL"] ?? "http://localhost:4300";
const CAPTURAS = process.env["HR_CAPTURAS"];
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

const ejecutable = buscarNavegador();

let fallas = 0;
let total = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  total += 1;
  if (!ok) fallas += 1;
  console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
}

const captura = async (page: Page, nombre: string, fullPage = false) => {
  if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, `${nombre}.png`), fullPage });
};

/** Espera a que el lector haya medido y paginado el texto. */
async function lectorListo(page: Page) {
  await page.waitForSelector('[aria-roledescription="lector"]', { timeout: 20_000 });
  await page.waitForFunction(
    () => document.querySelector("[data-reader-content].opacity-0") === null,
    null,
    {
      timeout: 20_000,
    },
  );
  await page.waitForTimeout(700);
}

const pie = (page: Page) => page.locator("footer").innerText();

/** Pasa de página hasta llegar al final. Devuelve cuántos avances hizo. */
async function leerHastaElFinal(page: Page): Promise<number> {
  for (let pasos = 0; pasos < 400; pasos++) {
    const siguiente = page.getByRole("button", { name: "Página siguiente" });
    if (await siguiente.isVisible()) {
      if (await siguiente.isDisabled()) return pasos;
      await siguiente.click();
    } else {
      // En celular no hay botones: se avanza con el teclado hasta que el pie deja de cambiar.
      const antes = await pie(page);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(450);
      if ((await pie(page)) === antes) return pasos;
    }
    await page.waitForTimeout(40);
  }
  return 400;
}

const browser = await chromium.launch({ executablePath: ejecutable, headless: true });
try {
  for (const [dispositivo, viewport] of [
    ["escritorio", { width: 1440, height: 900 }],
    ["celular", { width: 390, height: 844 }],
  ] as const) {
    const etiqueta = (t: string) => `[${dispositivo}] ${t}`;
    const context = await browser.newContext({ viewport, colorScheme: ESQUEMA });
    const page = await context.newPage();
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errores.push(m.text());
    });

    // --- El príncipe feliz
    await page.goto(`${BASE}/leer/el-principe-feliz`);
    await lectorListo(page);
    await captura(page, `${dispositivo}-principe-inicio`);
    const texto = await page.locator("[data-reader-content]").first().innerText();
    comprobar(
      etiqueta("El príncipe feliz abre con su texto"),
      texto.includes("En la parte más alta de la ciudad"),
    );
    const html = await page.content();
    comprobar(
      etiqueta("recupera el párrafo que el normalizador viejo cortaba"),
      html.includes("Este corazón de plomo no quiere fundirse en el horno"),
    );
    comprobar(
      etiqueta("la primera letra es capitular"),
      await page.evaluate(() => document.querySelector("p.drop-cap") !== null),
    );
    const pieInicial = await pie(page);
    comprobar(
      etiqueta("el pie muestra el tiempo restante"),
      /Quedan ≈ \d+ min/.test(pieInicial),
      pieInicial.replace(/\s+/g, " "),
    );

    const avances = await leerHastaElFinal(page);
    await captura(page, `${dispositivo}-principe-fin`);
    const pieFinal = await pie(page);
    comprobar(
      etiqueta(`llega al final de la pieza (${avances} avances)`),
      /Terminaste esta pieza/.test(pieFinal) && /100 %/.test(pieFinal),
    );
    comprobar(etiqueta("el cuento termina en FIN"), (await page.content()).includes(">FIN<"));

    await page.reload();
    await lectorListo(page);
    comprobar(etiqueta("al recargar vuelve a donde se quedó"), /100 %/.test(await pie(page)));

    // --- Nahual: capítulos, imágenes e índice
    await page.goto(`${BASE}/leer/nahual`);
    await lectorListo(page);
    await captura(page, `${dispositivo}-nahual-inicio`);
    const imagenes = await page.evaluate(() =>
      [...document.querySelectorAll("img")].map((i) => ({
        src: i.getAttribute("src"),
        ok: i.complete && i.naturalWidth > 0,
      })),
    );
    comprobar(
      etiqueta(`Nahual carga sus ${imagenes.length} imágenes`),
      imagenes.length >= 10 && imagenes.every((i) => i.ok),
      JSON.stringify(imagenes.filter((i) => !i.ok)),
    );
    const capitulos = await page.locator("h2[data-section]").allInnerTexts();
    comprobar(
      etiqueta("los 5 capítulos son títulos reales"),
      capitulos.join("|") === "Jornalero|Media Vida|Alambrado|Rezandera|Zopilotes",
      capitulos.join("|"),
    );

    await page.getByRole("button", { name: "Índice" }).click();
    await page.waitForTimeout(200);
    await captura(page, `${dispositivo}-nahual-indice`);
    const indice = await page.getByRole("navigation", { name: "Índice" }).innerText();
    comprobar(
      etiqueta("el índice lista las 5 piezas y los 5 capítulos"),
      [
        "Prólogo",
        "Nota del autor",
        "Nahual",
        "Epílogo",
        "Análisis visual de la obra",
        "Jornalero",
        "Zopilotes",
      ].every((t) => indice.includes(t)),
    );
    await page
      .getByRole("link", { name: /Prólogo/ })
      .first()
      .click();
    await page.waitForURL(/\/leer\/nahual\/nahual-prologo/);
    await lectorListo(page);
    await captura(page, `${dispositivo}-nahual-prologo`);
    comprobar(
      etiqueta("abre el prólogo con su texto"),
      (await page.content()).includes("Conozco al autor desde hace años"),
    );

    // --- Panel de ajustes del lector ("Aa")
    await page.goto(`${BASE}/leer/nahual`);
    await lectorListo(page);
    await page.getByRole("button", { name: "Ajustes de lectura" }).click();
    await captura(page, `${dispositivo}-ajustes`);
    await page.getByRole("radio", { name: "Amplio" }).click();
    await page.getByRole("radio", { name: "Sans" }).click();
    await page.waitForTimeout(300);
    const estilo = await page.evaluate(() => {
      const el = document.querySelector("[data-reader-content]");
      return el
        ? {
            interlineado: getComputedStyle(el).lineHeight,
            familia: getComputedStyle(el).fontFamily,
          }
        : null;
    });
    comprobar(
      etiqueta("los ajustes de interlineado y tipografía se aplican al texto"),
      estilo !== null &&
        /Jakarta/i.test(estilo.familia) &&
        parseFloat(estilo.interlineado) /
          parseFloat(
            await page.evaluate(
              () =>
                getComputedStyle(document.querySelector("[data-reader-content]") as Element)
                  .fontSize,
            ),
          ) >
          1.9,
      JSON.stringify(estilo),
    );
    await page.getByRole("radio", { name: "Normal" }).click();
    await page.getByRole("radio", { name: "Newsreader" }).click(); // deja la tipografía como estaba
    await page.keyboard.press("Escape");
    if (dispositivo === "escritorio") {
      await page.goto(`${BASE}/leer/nahual`);
      await lectorListo(page);
      await page.getByRole("button", { name: "Ajustes de lectura" }).click();
      await page.getByRole("radio", { name: "Tema Carbón" }).click();
      await page.keyboard.press("Escape");
      await captura(page, "escritorio-nahual-carbon");
      await page.getByRole("button", { name: "Ajustes de lectura" }).click();
      await page.getByRole("radio", { name: "Tema Bond" }).click(); // deja el tema como estaba
      await page.keyboard.press("Escape");
    }

    // --- Avance: Nahual a medio leer aparece en "Continúa leyendo" del inicio
    await page.goto(`${BASE}/leer/nahual`);
    await lectorListo(page);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(450);
    }

    // --- Ficha e inicio
    await page.goto(`${BASE}/libro/el-principe-feliz`);
    await page.waitForSelector("h1");
    await captura(page, `${dispositivo}-ficha-principe`, true);
    const esquina = await page.evaluate(() => {
      const boton = document.querySelector('a[aria-label^="Leer "]');
      const portada = boton?.parentElement?.querySelector("img");
      if (!boton || !portada) return null;
      const b = boton.getBoundingClientRect();
      const p = portada.getBoundingClientRect();
      return {
        dx: Math.round(b.left + b.width / 2 - p.right),
        dy: Math.round(b.top + b.height / 2 - p.bottom),
      };
    });
    comprobar(
      etiqueta("el botón de leer queda en la esquina inferior derecha de la portada"),
      esquina !== null && Math.abs(esquina.dx) <= 16 && Math.abs(esquina.dy) <= 16,
      esquina ? `dx=${esquina.dx} dy=${esquina.dy}` : "sin botón",
    );
    const ficha = (await page.locator("body").innerText()).toLowerCase();
    comprobar(
      etiqueta("la ficha muestra créditos, piezas, la lectura y lo 'por confirmar'"),
      ["yarely isabel campos servín", "dentro de este libro", "leer ahora", "por confirmar"].every(
        (s) => ficha.includes(s),
      ),
    );
    comprobar(
      etiqueta("la ficha trae el resumen, las piezas, el audiolibro y el Club de lectura"),
      [
        "en breve",
        "prólogo",
        "nota de la traductora",
        "audiolibro",
        "próximamente",
        "club de lectura",
        "vista de ejemplo",
        "compra verificada",
      ].every((s) => ficha.includes(s)),
    );
    comprobar(
      etiqueta("la ficha carga la portada"),
      await page.evaluate(() => {
        const i = document.querySelector("main img");
        return i instanceof HTMLImageElement && i.complete && i.naturalWidth > 0;
      }),
    );
    await page.goto(`${BASE}/`);
    await page.waitForURL("**/entrar", { timeout: 10_000 });
    comprobar(etiqueta("sin sesión, el inicio redirige a entrar"), page.url().includes("/entrar"));
    await page.getByRole("button", { name: "Continuar como invitado" }).click();
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 });
    await page.waitForSelector("h1");
    await page.waitForSelector("#fila-continua", { timeout: 5000 }).catch(() => null);
    await captura(page, `${dispositivo}-inicio`, true);
    const inicio = (await page.locator("main").innerText()).toLowerCase();
    comprobar(
      etiqueta("el inicio tiene la fila Ensayos y ya no Lecturas cortas"),
      inicio.includes("ensayos") && !inicio.includes("lecturas cortas"),
    );
    const izquierdas = await page.evaluate(() =>
      [...document.querySelectorAll("main section h2")].map((h) =>
        Math.round(h.getBoundingClientRect().left),
      ),
    );
    comprobar(
      etiqueta("todas las filas del inicio arrancan alineadas a la izquierda"),
      izquierdas.length >= 3 && new Set(izquierdas).size === 1,
      izquierdas.join(","),
    );
    if (dispositivo === "escritorio") {
      comprobar(
        etiqueta("la fila Ensayos tiene flechas para moverse"),
        (await page.getByRole("button", { name: "Siguientes en Ensayos" }).count()) === 1 &&
          (await page.getByRole("button", { name: "Anteriores en Ensayos" }).count()) === 1,
      );
    }
    comprobar(
      etiqueta("el inicio muestra Continúa leyendo con el avance guardado de Nahual"),
      inicio.includes("continúa leyendo") && /\d+ % leído/.test(inicio),
    );

    // --- Modo día / noche: automático según el dispositivo y botón sol/luna
    {
      const fondo = () =>
        page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
      const atributo = () =>
        page.evaluate(() => document.documentElement.getAttribute("data-tema"));
      const DIA = "rgb(253, 251, 247)";
      const NOCHE = "rgb(20, 20, 19)";
      const propio = ESQUEMA === "dark" ? NOCHE : DIA;
      const otro = ESQUEMA === "dark" ? DIA : NOCHE;
      await page.goto(`${BASE}/`);
      await page.waitForSelector("h1");
      comprobar(
        etiqueta("sin elegir nada, el sitio sigue el modo del dispositivo"),
        (await fondo()) === propio && (await atributo()) === null,
        await fondo(),
      );
      await page.getByTestId("boton-tema").click();
      comprobar(
        etiqueta("el botón sol/luna cambia al otro modo"),
        (await fondo()) === otro,
        await fondo(),
      );
      await page.reload();
      await page.waitForSelector("h1");
      comprobar(
        etiqueta("el modo elegido se recuerda al recargar, sin parpadeo"),
        (await fondo()) === otro && (await atributo()) !== null,
      );
      await page.getByTestId("boton-tema").click();
      comprobar(
        etiqueta("al volver al modo del dispositivo queda en automático"),
        (await fondo()) === propio &&
          (await atributo()) === null &&
          (await page.evaluate(() => localStorage.getItem("hr:tema"))) === null,
      );
    }

    comprobar(
      etiqueta("sin errores de JavaScript ni de consola"),
      errores.length === 0,
      errores.slice(0, 3).join(" | "),
    );

    const respuesta = await page.goto(`${BASE}/leer/nahual/no-existe`);
    comprobar(
      etiqueta("una pieza inexistente responde 404"),
      respuesta?.status() === 404,
      String(respuesta?.status()),
    );
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${total - fallas}/${total} comprobaciones OK`);
process.exitCode = fallas > 0 ? 1 : 0;
