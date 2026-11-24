import { describe, expect, it } from "vitest";
import { piezaTag } from "./index";
import type { Manifest } from "~/lib/libro/types";
import { essays, inProgress } from "./shelves";

describe("piezaTag", () => {
  it("resume el título de una pieza en una palabra para su listón", () => {
    expect(piezaTag("Prólogo")).toBe("prólogo");
    expect(piezaTag("Nota del autor")).toBe("nota");
    expect(piezaTag("Nota de la traductora")).toBe("nota");
    expect(piezaTag("Análisis visual de la obra")).toBe("análisis");
    expect(piezaTag("  Epílogo ")).toBe("epílogo");
    expect(piezaTag("")).toBe("");
  });
});

describe("essays (Ensayos)", () => {
  const stats = { words: 1150, paragraphs: 10, minutes: 5 };
  const manifests: Record<string, Manifest> = {
    "el-poder-de-la-sombra": {
      version: 1,
      obra: "el-poder-de-la-sombra",
      summary: "Sobre la sombra.",
      authors: ["Ana Ruiz"],
      pieces: [
        {
          slug: "el-poder-de-la-sombra",
          kind: "ensayo",
          title: "El poder de la sombra",
          credit: "Ana Ruiz",
          file: "el-poder-de-la-sombra.json",
          stats,
        },
      ],
    },
    "un-libro": {
      version: 1,
      obra: "un-libro",
      pieces: [
        { slug: "un-libro", kind: "libro", title: "Un libro", credit: null, file: "x.json", stats },
      ],
    },
  };

  it("solo trae las obras de tipo ensayo, con su autoría y resumen", () => {
    const items = essays(manifests);
    expect(items.map((i) => i.slug)).toEqual(["el-poder-de-la-sombra"]);
    expect(items[0]?.credit).toBe("Ana Ruiz");
    expect(items[0]?.summary).toBe("Sobre la sombra.");
    expect(items[0]?.minutes).toBe(5);
  });

  it("con el contenido actual no hay ensayos: la fila lo dice en vez de inventarlos", () => {
    expect(essays()).toEqual([]);
  });
});

describe("inProgress (Continúa leyendo)", () => {
  it("solo trae lo empezado y no terminado, lo más avanzado primero", () => {
    const saved: Record<string, number> = {
      nahual: 0.3,
      "el-principe-feliz": 0.8,
      "nahual-prologo": 1,
      "nahual-epilogo": 0,
      "el-principe-feliz-prologo": 0.05,
    };
    const result = inProgress((slug) => saved[slug] ?? null);
    expect(result.map((i) => i.slug)).toEqual([
      "el-principe-feliz",
      "nahual",
      "el-principe-feliz-prologo",
    ]);
    expect(result.map((i) => i.progress)).toEqual([0.8, 0.3, 0.05]);
  });

  it("sin avance guardado no hay nada que continuar", () => {
    expect(inProgress(() => null)).toEqual([]);
  });
});
