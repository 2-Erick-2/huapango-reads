/** Utilidades compartidas por las pruebas de navegador (`humo.ts` y `panel.ts`). */
import { existsSync } from "node:fs";

const NAVEGADORES = [
  process.env["HR_BROWSER"],
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

/** Ruta de un navegador instalado (Edge, Chrome o Chromium). Termina el proceso si no hay ninguno. */
export function buscarNavegador(): string {
  const ejecutable = NAVEGADORES.find((p) => p !== undefined && existsSync(p));
  if (!ejecutable) {
    console.error("No encontré Edge, Chrome ni Chromium. Indica uno con HR_BROWSER=<ruta>.");
    process.exit(2);
  }
  return ejecutable;
}

/**
 * Modo del dispositivo simulado (ADR 0022): HR_ESQUEMA=noche corre las pruebas con el teléfono o la
 * computadora en oscuro; por omisión, en claro (modo día).
 */
export const ESQUEMA: "light" | "dark" = process.env["HR_ESQUEMA"] === "noche" ? "dark" : "light";
console.log(`Modo del dispositivo: ${ESQUEMA === "dark" ? "noche" : "día"}\n`);

/** Cuenta y muestra comprobaciones; al final fija el código de salida. */
export class Reporte {
  total = 0;
  fallas = 0;

  comprobar(nombre: string, ok: boolean, detalle = "") {
    this.total += 1;
    if (!ok) this.fallas += 1;
    console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }

  cerrar() {
    console.log(`\n${this.total - this.fallas}/${this.total} comprobaciones OK`);
    process.exitCode = this.fallas > 0 ? 1 : 0;
  }
}
