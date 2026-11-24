/**
 * Garantías del modo día / noche (ADR 0022):
 * 1. Cada par de colores que se usa para leer cumple contraste WCAG AA en los DOS modos.
 * 2. El día "automático" y el día "elegido con el botón" son idénticos (CSS los repite).
 * 3. Ninguna pantalla vuelve a usar la paleta cruda (bond/carbón/terregal/ocre) en lugar de los
 *    colores con significado.
 * 4. El botón alterna bien y vuelve a "automático" cuando lo elegido coincide con el dispositivo.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCRIPT_TEMA, siguienteTema } from "./tema";

const css = readFileSync("src/styles/app.css", "utf8");

function variables(bloque: string): Record<string, string> {
  return Object.fromEntries(
    [...bloque.matchAll(/--hr-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [
      m[1] ?? "",
      (m[2] ?? "").toLowerCase(),
    ]),
  );
}
const entre = (desde: string, hasta: string) => {
  const a = css.indexOf(desde);
  const b = css.indexOf(hasta, a + desde.length);
  if (a < 0 || b < 0) throw new Error(`No encuentro el bloque ${desde}`);
  return css.slice(a, b);
};
const NOCHE = variables(entre("/* noche */", "/* día automático"));
const DIA_AUTO = variables(entre("/* día automático", "/* día elegido"));
const DIA = variables(entre("/* día elegido con el botón */", "@layer base"));

function luminancia(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = c.map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** [texto, fondo, mínimo]: 4.5 texto normal; 3 controles y texto grande. */
const PARES: ReadonlyArray<[string, string, number]> = [
  ...["fondo", "superficie"].flatMap((f): Array<[string, string, number]> => [
    ["tinta", f, 4.5],
    ["tinta-2", f, 4.5],
    ["tinta-suave", f, 4.5],
    ["tinta-tenue", f, 4.5],
    ["acento", f, 4.5],
    ["aviso", f, 4.5],
    ["borde", f, 3],
  ]),
  ["tinta", "superficie-2", 4.5],
  ["tinta-2", "superficie-2", 4.5],
  ["tinta-suave", "superficie-2", 4.5],
  ["acento", "superficie-2", 4.5],
  ["tinta", "control", 4.5],
  ["acento", "acento-tenue", 4.5],
];

describe("colores del modo día y noche", () => {
  it("los dos modos definen los mismos colores", () => {
    expect(Object.keys(NOCHE).length).toBeGreaterThan(20);
    expect(Object.keys(DIA).sort()).toEqual(Object.keys(NOCHE).sort());
  });

  it("el día automático y el día elegido con el botón son idénticos", () => {
    expect(DIA_AUTO).toEqual(DIA);
  });

  for (const [modo, colores] of [
    ["noche", NOCHE],
    ["día", DIA],
  ] as const) {
    it(`modo ${modo}: todos los pares de lectura cumplen contraste AA`, () => {
      const fallas = PARES.flatMap(([t, f, min]) => {
        const c = contraste(colores[t] ?? "#000000", colores[f] ?? "#000000");
        return c + 1e-9 < min ? [`${t} sobre ${f}: ${c.toFixed(2)} (mínimo ${min})`] : [];
      });
      expect(fallas).toEqual([]);
    });
    it(`modo ${modo}: el texto blanco de los botones principales se lee`, () => {
      expect(contraste("#ffffff", colores["acento-fondo"] ?? "#ffffff")).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contraste("#ffffff", colores["acento-fondo-hover"] ?? "#ffffff"),
      ).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("el día usa la paleta de la landing (papel bond, carbón y teja oscura)", () => {
    expect(DIA["fondo"]).toBe("#fdfbf7");
    expect(DIA["tinta"]).toBe("#141413");
    expect(DIA["acento"]).toBe("#a3452b");
    expect(NOCHE["fondo"]).toBe("#141413");
  });
});

describe("guardia: las pantallas usan colores con significado", () => {
  const archivos = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const ruta = join(dir, n);
      if (statSync(ruta).isDirectory()) return archivos(ruta);
      return ruta.endsWith(".tsx") ? [ruta] : [];
    });

  it("ningún componente usa la paleta cruda (bond, carbón, terregal, ocre)", () => {
    const crudo =
      /\b(?:bg|text|border|divide|placeholder|ring|from|via|to|fill|stroke|accent|outline|decoration|shadow)-(?:bond|carbon|terregal|ochre)-\d{2,3}\b/g;
    const hallazgos = archivos("src").flatMap((ruta) =>
      [...readFileSync(ruta, "utf8").matchAll(crudo)].map((m) => `${ruta}: ${m[0]}`),
    );
    expect(hallazgos).toEqual([]);
  });
});

describe("botón sol / luna", () => {
  it("alterna y vuelve a automático cuando coincide con el dispositivo", () => {
    expect(siguienteTema("noche", "noche")).toEqual({ tema: "dia", guardar: "dia" });
    expect(siguienteTema("dia", "noche")).toEqual({ tema: "noche", guardar: null });
    expect(siguienteTema("dia", "dia")).toEqual({ tema: "noche", guardar: "noche" });
    expect(siguienteTema("noche", "dia")).toEqual({ tema: "dia", guardar: null });
  });

  it("el script de arranque es válido y solo acepta los dos modos", () => {
    expect(() => new Function(SCRIPT_TEMA)).not.toThrow();
    expect(SCRIPT_TEMA).toContain('t==="dia"||t==="noche"');
  });
});
