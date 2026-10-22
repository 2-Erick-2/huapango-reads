import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

/**
 * Subruta donde se sirve la app (ADR 0009). "/" por defecto; en el demo de GitHub Pages
 * el workflow define BASE_PATH=/huapango-reads/ y NITRO_PRESET=github_pages.
 */
const base = process.env.BASE_PATH ?? "/";
const isStatic = process.env.NITRO_PRESET === "github_pages";

// SolidStart v2 + Nitro v3. En Vercel, Nitro detecta el preset automáticamente (ADR 0002).
export default defineConfig({
  base,
  plugins: [
    solidStart(),
    nitro({
      baseURL: base,
      // Sitio 100 % estático para GitHub Pages: se prerenderizan todas las páginas
      // siguiendo los enlaces desde el inicio.
      ...(isStatic && {
        prerender: {
          crawlLinks: true,
          routes: ["/", "/leer/demo", "/404.html"],
          failOnError: true,
        },
      }),
    }),
    tailwindcss(),
  ],
});
