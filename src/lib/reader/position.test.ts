import { describe, expect, it } from "vitest";
import { loadPosition, minutesLeft, ratioOf, savePosition, spreadOfRatio } from "./position";

function fakeStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe("posición de lectura", () => {
  it("guarda y recupera la proporción por pieza", () => {
    const store = fakeStore();
    savePosition("nahual", 0.42, store);
    expect(loadPosition("nahual", store)).toBe(0.42);
    expect(loadPosition("otra", store)).toBeNull();
  });

  it("acota valores fuera de rango y descarta basura", () => {
    const store = fakeStore({
      "hr:reader:pos:a": "7",
      "hr:reader:pos:b": "-3",
      "hr:reader:pos:c": "hola",
    });
    expect(loadPosition("a", store)).toBe(1);
    expect(loadPosition("b", store)).toBe(0);
    expect(loadPosition("c", store)).toBeNull();
    savePosition("d", 5, store);
    expect(store.data.get("hr:reader:pos:d")).toBe("1");
  });

  it("no falla si el almacenamiento está bloqueado o no existe", () => {
    const roto = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(loadPosition("x", roto)).toBeNull();
    expect(() => savePosition("x", 0.5, roto)).not.toThrow();
    expect(loadPosition("x", null)).toBeNull();
    expect(() => savePosition("x", 0.5, null)).not.toThrow();
  });

  it("convierte entre pliego y proporción sin salirse del rango", () => {
    expect(ratioOf(0, 1)).toBe(0);
    expect(ratioOf(0, 10)).toBe(0);
    expect(ratioOf(9, 10)).toBe(1);
    expect(ratioOf(4, 10)).toBeCloseTo(4 / 9);
    expect(spreadOfRatio(0, 10)).toBe(0);
    expect(spreadOfRatio(1, 10)).toBe(9);
    expect(spreadOfRatio(0.5, 11)).toBe(5);
    // Si el texto se repagina (otra letra), la misma proporción cae en el pliego equivalente.
    expect(spreadOfRatio(ratioOf(4, 10), 20)).toBe(8);
  });

  it("calcula los minutos que faltan", () => {
    expect(minutesLeft(14, 0)).toBe(14);
    expect(minutesLeft(14, 0.5)).toBe(7);
    expect(minutesLeft(14, 0.99)).toBe(1);
    expect(minutesLeft(14, 1)).toBe(0);
    expect(minutesLeft(14, 2)).toBe(0);
  });
});
