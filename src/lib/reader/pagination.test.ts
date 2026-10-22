import { describe, expect, it } from "vitest";
import {
  columnOfOffset,
  computeLayout,
  countColumns,
  countSpreads,
  remapSpread,
  spreadOfColumn,
} from "./pagination";

describe("paginación por columnas", () => {
  it("usa pliego de 2 páginas en pantallas anchas y 1 en angostas", () => {
    expect(computeLayout(1200, 96).columns).toBe(2);
    expect(computeLayout(360, 48).columns).toBe(1);
  });

  it("calcula ancho de columna y paso", () => {
    const l = computeLayout(1000, 100);
    expect(l.columnWidth).toBe(450);
    expect(l.step).toBe(1100);
  });

  it("cuenta columnas y pliegos a partir del scrollWidth", () => {
    const l = computeLayout(1000, 100); // columnas de 450 + 100 de separación
    // 5 columnas: 5*450 + 4*100 = 2650
    expect(countColumns(2650, l)).toBe(5);
    expect(countSpreads(5, l)).toBe(3);
  });

  it("ubica columnas y elementos en su pliego", () => {
    const l = computeLayout(1000, 100);
    expect(columnOfOffset(0, l)).toBe(0);
    expect(columnOfOffset(1100, l)).toBe(2);
    expect(spreadOfColumn(2, l)).toBe(1);
  });

  it("conserva la posición proporcional al cambiar el total de pliegos", () => {
    expect(remapSpread(5, 11, 21)).toBe(10);
    expect(remapSpread(0, 1, 9)).toBe(0);
    expect(remapSpread(8, 9, 5)).toBe(4);
  });
});
