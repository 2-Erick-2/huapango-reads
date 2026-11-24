import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

/**
 * Subruta donde se sirve la app (ADR 0009). "/" por defecto; en el demo de GitHub Pages
 * el workflow define BASE_PATH=/huapango-reads/ y NITRO_PRESET=github_pages.
 */
const base = process.env.BASE_PATH ?? "/";

/**
 * Rutas de lectura de todas las piezas importadas (/leer/<obra> y /leer/<obra>/<pieza>), para que el
 * demo estático las genere aunque ningún enlace de la página de inicio las alcance.
 * Salen de los manifiestos que escribe `npm run contenido:publicar`.
 */
function rutasDeLectura(): string[] {
  const dir = join(process.cwd(), "public", "contenido");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const file = join(dir, d.name, "manifest.json");
    if (!d.isDirectory() || !existsSync(file)) return [];
    const manifest = JSON.parse(readFileSync(file, "utf8")) as { pieces: Array<{ slug: string }> };
    return [`/leer/${d.name}`, ...manifest.pieces.map((p) => `/leer/${d.name}/${p.slug}`)];
  });
}
const isStatic = process.env.NITRO_PRESET === "github_pages";

// SolidStart v2 + Nitro v3. En Vercel, Nitro detecta el preset automáticamente (ADR 0002).
export default defineConfig({
  base,
  optimizeDeps: {
    include: ["@jridgewell/resolve-uri", "@jridgewell/trace-mapping"],
  },
  plugins: [
    solidStart(),
    nitro({
      baseURL: base,
      // Sitio 100 % estático para GitHub Pages: se prerenderizan todas las páginas
      // siguiendo los enlaces desde el inicio.
      ...(isStatic && {
        prerender: {
          crawlLinks: true,
          routes: ["/", "/leer/demo", "/404.html", ...rutasDeLectura()],
          failOnError: true,
        },
      }),
    }),
    tailwindcss(),
  ],
});
