import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

// SolidStart v2 + Nitro v3. En Vercel, Nitro detecta el preset automáticamente (ADR 0002).
export default defineConfig({
  plugins: [solidStart(), nitro(), tailwindcss()],
});
