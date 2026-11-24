/**
 * Procesa portadas: recorta, ajusta a la proporción real del libro (25:36) y exporta JPG + WebP en
 * 500 px y 260 px (los tamaños que usa la app, ver `public/books/`). Usa el canvas de un navegador.
 *
 *   node scripts/assets/portadas.ts <carpeta-salida> <especificacion.json>
 *
 * Especificación: lista de { slug, src, modo, sesgoSuperior }
 *   - slug          nombre del libro: genera portada-<slug>.jpg, .webp y -260.webp
 *   - src           imagen de origen (PNG o JPG)
 *   - modo "bbox"           recorta los márgenes blancos de una exportación
 *   - modo "panel-derecho"  la imagen es una cubierta extendida (contraportada + lomo + portada):
 *                           se queda con el panel derecho, a partir del lomo (franja de color liso)
 *   - sesgoSuperior (0 a 1) si sobra alto, qué fracción del sobrante se corta por arriba (por omisión 0.5).
 *                           Con 0.25 se protege el logo de arriba.
 *
 * Por qué con un navegador y no con sharp: ver ADR 0017.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

interface Especificacion {
  slug: string;
  src: string;
  modo: "bbox" | "panel-derecho";
  sesgoSuperior?: number;
}

interface Resultado {
  W: number;
  H: number;
  caja: number[];
  recorte: number[];
  nota: string;
  jpg: string;
  webp: string;
  webp260: string;
}

const [salida, especificacion] = process.argv.slice(2);
if (!salida || !especificacion) {
  console.error("Uso: node scripts/assets/portadas.ts <carpeta-salida> <especificacion.json>");
  process.exit(2);
}
const specs = JSON.parse(readFileSync(especificacion, "utf8")) as Especificacion[];
mkdirSync(salida, { recursive: true });

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

// Se ejecuta dentro del navegador. Reduce a mitades sucesivas para conservar nitidez.
const CODIGO_NAVEGADOR = `
  const load = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const near = (a, b, t) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) <= t;
  function resize(src, sx, sy, sw, sh, tw, th) {
    let cur = document.createElement('canvas'); cur.width = sw; cur.height = sh;
    cur.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    while (cur.width / 2 >= tw && cur.height / 2 >= th) {
      const n = document.createElement('canvas'); n.width = Math.round(cur.width / 2); n.height = Math.round(cur.height / 2);
      const ng = n.getContext('2d'); ng.imageSmoothingQuality = 'high'; ng.drawImage(cur, 0, 0, n.width, n.height); cur = n;
    }
    const out = document.createElement('canvas'); out.width = tw; out.height = th;
    const og = out.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(cur, 0, 0, tw, th);
    return out;
  }
  window.procesar = async (dataUrl, spec) => {
    const img = await load(dataUrl);
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const px = (x, y) => { const d = g.getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; };
    let x0 = 0, y0 = 0, x1 = W, y1 = H, nota = '';
    if (spec.modo === 'bbox') {
      const isWhite = (d, i) => d[i] > 244 && d[i+1] > 244 && d[i+2] > 244;
      const colHasInk = (x) => { const d = g.getImageData(x, 0, 1, H).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (!isWhite(d, i)) n++; return n > H * 0.15; };
      const rowHasInk = (y) => { const d = g.getImageData(0, y, W, 1).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (!isWhite(d, i)) n++; return n > W * 0.15; };
      while (x0 < W && !colHasInk(x0)) x0++;
      while (x1 > x0 && !colHasInk(x1 - 1)) x1--;
      while (y0 < H && !rowHasInk(y0)) y0++;
      while (y1 > y0 && !rowHasInk(y1 - 1)) y1--;
      nota = 'bbox';
    } else if (spec.modo === 'panel-derecho') {
      const sy = Math.round(H * 0.03);
      const spine = px(Math.round(W * 0.47), sy);
      let last = Math.round(W * 0.47);
      for (let x = Math.round(W * 0.47); x < Math.round(W * 0.7); x++) if (near(px(x, sy), spine, 40)) last = x;
      x0 = last + 1; nota = 'lomo=' + JSON.stringify(spine) + ' borde=' + last;
    }
    const w = x1 - x0, h = y1 - y0, target = 36 / 25;
    let cx0 = x0, cy0 = y0, cw = w, ch = h;
    if (h / w > target) { ch = Math.round(w * target); cy0 = y0 + Math.round((h - ch) * (spec.sesgoSuperior ?? 0.5)); }
    else { cw = Math.round(h / target); cx0 = x0 + Math.round((w - cw) / 2); }
    const big = resize(img, cx0, cy0, cw, ch, 500, 720);
    const small = resize(img, cx0, cy0, cw, ch, 260, 374);
    const enc = (cv, type, q) => cv.toDataURL(type, q).split(',')[1];
    return { W, H, caja: [x0, y0, x1, y1], recorte: [cx0, cy0, cw, ch], nota,
      jpg: enc(big, 'image/jpeg', 0.9), webp: enc(big, 'image/webp', 0.84), webp260: enc(small, 'image/webp', 0.82) };
  };`;

const browser = await chromium.launch({ executablePath: ejecutable, headless: true });
try {
  const page = await browser.newPage();
  await page.setContent("<canvas id='c'></canvas>");
  await page.addScriptTag({ content: CODIGO_NAVEGADOR });
  for (const spec of specs) {
    const datos = readFileSync(spec.src);
    const mime = spec.src.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    const r = (await page.evaluate(
      ([url, s]) =>
        (window as unknown as { procesar: (u: string, s: unknown) => Promise<unknown> }).procesar(
          url,
          s,
        ),
      [`data:${mime};base64,${datos.toString("base64")}`, spec] as const,
    )) as Resultado;
    const base = join(salida, `portada-${spec.slug}`);
    writeFileSync(`${base}.jpg`, Buffer.from(r.jpg, "base64"));
    writeFileSync(`${base}.webp`, Buffer.from(r.webp, "base64"));
    writeFileSync(`${base}-260.webp`, Buffer.from(r.webp260, "base64"));
    console.log(
      `${spec.slug}: origen ${r.W}×${r.H}, caja ${r.caja.join(",")}, recorte ${r.recorte.join(",")} ${r.nota}`,
    );
  }
} finally {
  await browser.close();
}
