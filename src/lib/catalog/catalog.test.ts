import { describe, expect, it } from "vitest";
import { BOOKS, COLLECTIONS, UPCOMING } from "./data";
import { formatAuthors, formatDigitalPrice, getBook, getHomeRows } from "./index";

describe("catálogo", () => {
  it("tiene los 4 libros publicados con slugs únicos", () => {
    expect(BOOKS).toHaveLength(4);
    expect(new Set(BOOKS.map((b) => b.slug)).size).toBe(BOOKS.length);
  });

  it("cada libro pertenece a una colección existente", () => {
    const slugs = new Set(COLLECTIONS.map((c) => c.slug));
    for (const b of [...BOOKS, ...UPCOMING]) expect(slugs.has(b.collection)).toBe(true);
  });

  it("no inventa precio digital: muestra 'Precio por confirmar'", () => {
    for (const b of BOOKS) expect(formatDigitalPrice(b)).toBe("Precio por confirmar");
    expect(formatDigitalPrice({ digitalPriceMXN: 99 })).toContain("99");
  });

  it("une coautores con &", () => {
    expect(formatAuthors(["Eduardo Serrato", "Luis Armando Rosado"])).toBe(
      "Eduardo Serrato & Luis Armando Rosado",
    );
  });

  it("encuentra libros por slug", async () => {
    expect((await getBook("terregal"))?.prologue).toBe("Prólogo de Renato Tinajero");
    expect(await getBook("no-existe")).toBeUndefined();
  });

  it("arma las filas del inicio con Novedades primero y Próximamente al final", async () => {
    const rows = await getHomeRows();
    expect(rows[0]?.id).toBe("novedades");
    expect(rows.at(-1)?.id).toBe("proximamente");
    expect(rows.at(-1)?.items).toHaveLength(UPCOMING.length);
  });
});
