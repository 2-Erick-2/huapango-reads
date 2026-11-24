import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Pruebas de lógica pura (catálogo, paginación, formato canónico) y del importador de contenido
// (scripts/ingesta). Sin plugins de SolidStart a propósito.
export default defineConfig({
  resolve: { alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
});
