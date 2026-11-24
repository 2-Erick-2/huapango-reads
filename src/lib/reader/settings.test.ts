import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";
import { FONT_SIZE } from "./types";

describe("parseSettings", () => {
  it("sin datos devuelve los valores por omisión", () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("basura")).toEqual(DEFAULT_SETTINGS);
  });

  it("acepta preferencias válidas", () => {
    expect(parseSettings({ theme: "carbon", fontSize: 22, font: "sans", leading: "wide" })).toEqual(
      {
        theme: "carbon",
        fontSize: 22,
        font: "sans",
        leading: "wide",
      },
    );
  });

  it("descarta lo inválido campo por campo y conserva lo bueno", () => {
    expect(parseSettings({ theme: "neon", fontSize: "grande", font: "comic", leading: 3 })).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(parseSettings({ theme: "sepia", font: "inexistente" })).toEqual({
      ...DEFAULT_SETTINGS,
      theme: "sepia",
    });
  });

  it("acota el tamaño de letra y redondea", () => {
    expect(parseSettings({ fontSize: 99 }).fontSize).toBe(FONT_SIZE.max);
    expect(parseSettings({ fontSize: 1 }).fontSize).toBe(FONT_SIZE.min);
    expect(parseSettings({ fontSize: 18.6 }).fontSize).toBe(19);
    expect(parseSettings({ fontSize: Number.NaN }).fontSize).toBe(FONT_SIZE.default);
  });

  it("lee las preferencias de versiones anteriores (solo tema y tamaño)", () => {
    expect(parseSettings({ theme: "sepia", fontSize: 20 })).toEqual({
      theme: "sepia",
      fontSize: 20,
      font: "serif",
      leading: "normal",
    });
  });
});
