import { describe, expect, it } from "vitest";
import { buildZip } from "./testing/epub-builder.ts";
import { openZip } from "./zip.ts";

describe("openZip", () => {
  it("lee entradas comprimidas y sin comprimir", () => {
    const zip = openZip(
      buildZip([
        { name: "a.txt", data: "hola mundo", method: 8 },
        { name: "carpeta/b.txt", data: "sin comprimir", method: 0 },
      ]),
    );
    expect(zip.get("a.txt")?.read().toString()).toBe("hola mundo");
    expect(zip.get("carpeta/b.txt")?.read().toString()).toBe("sin comprimir");
  });

  it("rechaza rutas inseguras (zip-slip)", () => {
    expect(() => openZip(buildZip([{ name: "../fuera.txt", data: "x" }]))).toThrow(/insegura/);
    expect(() => openZip(buildZip([{ name: "/abs.txt", data: "x" }]))).toThrow(/insegura/);
    expect(() => openZip(buildZip([{ name: "a\\b.txt", data: "x" }]))).toThrow(/insegura/);
  });

  it("rechaza nombres repetidos", () => {
    expect(() =>
      openZip(
        buildZip([
          { name: "a.txt", data: "1" },
          { name: "a.txt", data: "2" },
        ]),
      ),
    ).toThrow(/repetida/);
  });

  it("rechaza entradas cifradas", () => {
    expect(() => openZip(buildZip([{ name: "a.txt", data: "x", flags: 1 }]))).toThrow(/cifrada/);
  });

  it("detecta un CRC que no coincide", () => {
    const zip = openZip(buildZip([{ name: "a.txt", data: "contenido", crc: 12345 }]));
    expect(() => zip.get("a.txt")?.read()).toThrow(/CRC/);
  });

  it("rechaza entradas que exceden el límite (bombas de descompresión)", () => {
    const buf = buildZip([{ name: "grande.txt", data: "x".repeat(1000) }]);
    expect(() => openZip(buf, { maxEntries: 10, maxEntryBytes: 100, maxTotalBytes: 1000 })).toThrow(
      /demasiado grande/,
    );
    expect(() => openZip(buf, { maxEntries: 10, maxEntryBytes: 5000, maxTotalBytes: 500 })).toThrow(
      /límite total/,
    );
    expect(() => openZip(buf, { maxEntries: 0, maxEntryBytes: 5000, maxTotalBytes: 5000 })).toThrow(
      /entradas/,
    );
  });

  it("falla con archivos que no son ZIP", () => {
    expect(() => openZip(Buffer.from("esto no es un zip, ni de cerca"))).toThrow(/ZIP/);
  });
});
