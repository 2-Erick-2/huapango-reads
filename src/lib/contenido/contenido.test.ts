import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BOOKS } from "~/lib/catalog/data";
import type { Manifest, Pieza } from "~/lib/libro/types";
import { validatePieza } from "~/lib/libro/validate";
import {
  bookReadHref,
  complementos,
  findEntry,
  getManifest,
  loadPieza,
  mainEntry,
  readHref,
} from "./index";
import { MANIFESTS } from "./manifests.generated";

const publico = resolve(process.cwd(), "public", "contenido");
const obras = existsSync(publico)
  ? readdirSync(publico).filter((d) => existsSync(join(publico, d, "manifest.json")))
  : [];
const leer = <T>(...partes: string[]): T =>
  JSON.parse(readFileSync(join(publico, ...partes), "utf8")) as T;

describe("contenido publicado en public/contenido (corre también en CI)", () => {
  it("hay contenido publicado", () => {
    expect(obras.length).toBeGreaterThan(0);
  });

  it("el manifiesto compilado en la app es idéntico al de public/ (nadie lo dejó desactualizado)", () => {
    expect(Object.keys(MANIFESTS).sort()).toEqual([...obras].sort());
    for (const obra of obras)
      expect(MANIFESTS[obra]).toEqual(leer<Manifest>(obra, "manifest.json"));
  });

  for (const obra of obras) {
    describe(obra, () => {
      const manifest = leer<Manifest>(obra, "manifest.json");
      const assets = new Set(readdirSync(join(publico, obra, "assets")));

      it("tiene exactamente un libro y sus complementos ligados a él", () => {
        expect(manifest.pieces.filter((p) => p.kind === "libro")).toHaveLength(1);
        const libro = manifest.pieces.find((p) => p.kind === "libro");
        for (const entry of manifest.pieces) {
          const pieza = leer<Pieza>(obra, entry.file);
          expect(pieza.slug).toBe(entry.slug);
          expect(pieza.parentSlug).toBe(entry.kind === "libro" ? null : (libro?.slug ?? null));
        }
      });

      for (const entry of manifest.pieces) {
        it(`la pieza "${entry.slug}" es válida, sin párrafos cortados y con todas sus imágenes`, () => {
          const pieza = leer<Pieza>(obra, entry.file);
          expect(validatePieza(pieza, assets)).toEqual([]);
          expect(pieza.stats).toEqual(entry.stats);
        });
      }

      it("no deja imágenes sin usar en assets/", () => {
        const usadas = new Set(
          manifest.pieces.flatMap((e) =>
            leer<Pieza>(obra, e.file).blocks.flatMap((b) => (b.type === "image" ? [b.asset] : [])),
          ),
        );
        expect([...assets].filter((a) => !usadas.has(a))).toEqual([]);
      });
    });
  }

  it("todo libro del catálogo con lectura apunta a una obra y una pieza principal que existen", () => {
    for (const book of BOOKS.filter((b) => b.read !== null)) {
      const manifest = getManifest(book.read?.obra ?? "");
      expect(manifest, book.slug).toBeDefined();
      expect(mainEntry(manifest as Manifest)?.slug, book.slug).toBe(book.read?.slug);
    }
  });
});

describe("rutas de lectura", () => {
  it("arma los enlaces del lector", () => {
    expect(readHref("nahual")).toBe("/leer/nahual");
    expect(readHref("nahual", "nahual-prologo")).toBe("/leer/nahual/nahual-prologo");
  });

  it("un libro sin contenido importado cae al lector de demostración", () => {
    expect(bookReadHref({ read: null })).toBe("/leer/demo");
    expect(bookReadHref({ read: { obra: "nahual", slug: "nahual" } })).toBe("/leer/nahual");
  });

  it("separa el libro de sus complementos y los ordena como se leen", () => {
    const manifest = getManifest("nahual") as Manifest;
    expect(mainEntry(manifest)?.slug).toBe("nahual");
    expect(complementos(manifest).map((p) => p.slug)).toEqual([
      "nahual-prologo",
      "nahual-nota-del-autor",
      "nahual-epilogo",
      "nahual-analisis-visual",
    ]);
    expect(findEntry(manifest, "no-existe")).toBeUndefined();
  });
});

describe("loadPieza", () => {
  const respuesta = (body: unknown, ok = true, status = 200) =>
    (async () => ({ ok, status, json: async () => body }) as Response) as unknown as typeof fetch;

  it("descarga y valida la pieza", async () => {
    const real = leer<Pieza>("nahual", "nahual.json");
    const fetcher = respuesta(real);
    const pieza = await loadPieza("nahual", "nahual", fetcher);
    expect(pieza.slug).toBe("nahual");
  });

  it("falla con un mensaje claro si la obra o la pieza no existen", async () => {
    await expect(loadPieza("nahual", "nope", respuesta({}))).rejects.toThrow(/No existe la pieza/);
    await expect(loadPieza("nope", "nahual", respuesta({}))).rejects.toThrow(/No existe la pieza/);
  });

  it("falla si el servidor responde con error o el archivo no es el esperado", async () => {
    await expect(loadPieza("nahual", "nahual", respuesta({}, false, 404))).rejects.toThrow(
      /HTTP 404/,
    );
    await expect(
      loadPieza("nahual", "nahual", respuesta({ version: 1, slug: "otra", blocks: [] })),
    ).rejects.toThrow(/formato esperado/);
    await expect(
      loadPieza("nahual", "nahual", respuesta({ version: 2, slug: "nahual", blocks: [] })),
    ).rejects.toThrow(/formato esperado/);
  });
});
