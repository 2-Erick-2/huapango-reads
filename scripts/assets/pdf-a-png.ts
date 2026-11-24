/**
 * Rasteriza las páginas de un PDF a PNG usando `pdf.js` dentro de un navegador (Edge/Chrome).
 *
 *   npm i --no-save pdfjs-dist
 *   node scripts/assets/pdf-a-png.ts <archivo.pdf> <salida-sin-extensión> [escala=1.5] [pagina]
 *
 * Existe porque en algunos equipos Windows no arrancan los binarios nativos (poppler, canvas de
 * Node, sharp): ver ADR 0017. No necesita ningún binario propio, solo un navegador instalado.
 * Con `escala` 1 una página mide su tamaño en puntos (1 pt = 1/72 in); 4 es buena para cortar portadas.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright-core";

const [pdfPath, salida, escalaArg, paginaArg] = process.argv.slice(2);
if (!pdfPath || !salida) {
  console.error(
    "Uso: node scripts/assets/pdf-a-png.ts <archivo.pdf> <salida-sin-extensión> [escala] [pagina]",
  );
  process.exit(2);
}
const escala = Number(escalaArg ?? 1.5);
const raiz = resolve(process.cwd());
if (!existsSync(join(raiz, "node_modules", "pdfjs-dist", "build", "pdf.mjs"))) {
  console.error("Falta pdfjs-dist. Instálalo sin tocar package.json: npm i --no-save pdfjs-dist");
  process.exit(2);
}

const NAVEGADORES = [
  process.env["HR_BROWSER"],
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];
const ejecutable = NAVEGADORES.find((p) => p !== undefined && existsSync(p));
if (!ejecutable) {
  console.error("No encontré Edge, Chrome ni Chromium. Indica uno con HR_BROWSER=<ruta>.");
  process.exit(2);
}

const MIME: Record<string, string> = {
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".json": "application/json",
};
const pagina = `<!doctype html><meta charset="utf-8"><canvas id="c"></canvas><script type="module">
import * as pdfjs from "/node_modules/pdfjs-dist/build/pdf.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.mjs";
const doc = await pdfjs.getDocument({ url: "/doc.pdf" }).promise;
window.numPages = doc.numPages;
window.renderPage = async (n, scale) => {
  const page = await doc.getPage(n);
  const viewport = page.getViewport({ scale });
  const canvas = document.getElementById("c");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  const [x0, y0, x1, y1] = page.view;
  return { url: canvas.toDataURL("image/png"), w: x1 - x0, h: y1 - y0 };
};
window.ready = true;
</script>`;

const servidor = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
  if (url === "/") {
    res.setHeader("content-type", "text/html");
    res.end(pagina);
  } else if (url === "/doc.pdf") {
    res.setHeader("content-type", "application/pdf");
    res.end(readFileSync(pdfPath));
  } else {
    const archivo = join(raiz, url);
    if (
      !archivo.startsWith(join(raiz, "node_modules")) ||
      !existsSync(archivo) ||
      statSync(archivo).isDirectory()
    ) {
      res.statusCode = 404;
      res.end("no");
      return;
    }
    res.setHeader("content-type", MIME[extname(archivo)] ?? "application/octet-stream");
    res.end(readFileSync(archivo));
  }
});
await new Promise<void>((listo) => servidor.listen(0, "127.0.0.1", listo));
const address = servidor.address();
const puerto = typeof address === "object" && address ? address.port : 0;

const browser = await chromium.launch({ executablePath: ejecutable, headless: true });
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("error en la página:", e.message));
  await page.goto(`http://127.0.0.1:${puerto}/`);
  await page.waitForFunction("window.ready === true", null, { timeout: 60_000 });
  const total = Number(await page.evaluate("window.numPages"));
  const paginas = paginaArg ? [Number(paginaArg)] : Array.from({ length: total }, (_, i) => i + 1);
  for (const n of paginas) {
    const r = await page.evaluate(
      ([p, s]) =>
        (
          window as unknown as {
            renderPage: (p: number, s: number) => Promise<{ url: string; w: number; h: number }>;
          }
        ).renderPage(p, s),
      [n, escala] as const,
    );
    const archivo = `${salida}-${n}.png`;
    writeFileSync(archivo, Buffer.from(r.url.split(",")[1] ?? "", "base64"));
    console.log(
      `pág ${n}/${total}: ${Math.round(r.w)}×${Math.round(r.h)} pt (${((r.w / 72) * 2.54).toFixed(1)}×${((r.h / 72) * 2.54).toFixed(1)} cm) → ${archivo}`,
    );
  }
} finally {
  await browser.close();
  servidor.close();
}
