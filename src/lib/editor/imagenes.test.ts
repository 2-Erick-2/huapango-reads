import { describe, expect, it } from "vitest";
import {
  calcularPppImpresion,
  esPngReal,
  leerPng,
  nombreAssetPng,
  PPP_MINIMO_IMPRESION,
} from "./imagenes";

function pngDePrueba(ancho: number, alto: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
  const view = new DataView(bytes.buffer);
  view.setUint32(16, ancho, false);
  view.setUint32(20, alto, false);
  return bytes;
}

describe("validación de PNG real para el editor", () => {
  it("acepta un PNG auténtico y lee su ancho y alto desde IHDR", () => {
    const png = pngDePrueba(1200, 800);
    expect(esPngReal(png)).toBe(true);
    expect(leerPng(png)).toEqual({ ancho: 1200, alto: 800 });
  });

  it("rechaza un JPEG renombrado a .png (firma falsa)", () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);
    expect(esPngReal(jpg)).toBe(false);
    expect(leerPng(jpg)).toBeNull();
  });

  it("rechaza un PNG truncado o sin IHDR", () => {
    const roto = pngDePrueba(500, 500);
    roto[12] = 0x58;
    expect(leerPng(roto)).toBeNull();
    expect(leerPng(new Uint8Array([0x89, 0x50, 0x4e]))).toBeNull();
  });

  it("calcula los ppp efectivos en media carta según el tamaño elegido", () => {
    // 1050 px a 100 % sobre 250 pt (~3.47 in) = ~302 ppp (>= 300)
    expect(calcularPppImpresion(1050, "ilustracion", 100)).toBeGreaterThanOrEqual(
      PPP_MINIMO_IMPRESION,
    );
    // 800 px a 100 % queda por debajo de 300 ppp, pero a 60 % sí supera 300 ppp
    expect(calcularPppImpresion(800, "ilustracion", 100)).toBeLessThan(PPP_MINIMO_IMPRESION);
    expect(calcularPppImpresion(800, "ilustracion", 60)).toBeGreaterThanOrEqual(
      PPP_MINIMO_IMPRESION,
    );
  });

  it("normaliza el nombre del archivo a slug seguro terminado en .png", () => {
    expect(nombreAssetPng("Ilustración Árbol (Final).PNG", "ab12cd")).toBe(
      "ilustracion-arbol-final-ab12cd.png",
    );
  });
});
