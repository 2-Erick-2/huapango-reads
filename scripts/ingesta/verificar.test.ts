import { describe, expect, it } from "vitest";
import {
  compararPalabras,
  describirHunk,
  palabrasDeBloques,
  palabrasIndependientes,
} from "./verificar.ts";
import { hashText } from "../../src/lib/libro/text.ts";
import type { Block } from "../../src/lib/libro/types.ts";

describe("palabrasIndependientes", () => {
  it("cuenta el texto sin usar el parser: ignora cabecera, estilos y marcas de página", () => {
    const xhtml = `<?xml version="1.0"?><!DOCTYPE html>
      <html><head><title>No cuenta</title><style>p { color: red; }</style></head>
      <body>
        <div id="page1" role="doc-pagebreak" aria-label="1" epub:type="pagebreak" />
        <p>La golondrina se sintió <span id="p2" role="doc-pagebreak" aria-label="2"/>muy solitaria &amp; triste.</p>
        <p>Otra<br/>línea.</p>
        <p>caf&#233; &#xE1;rbol</p>
        <img src="a.png" alt="texto alternativo que no cuenta"/>
      </body></html>`;
    expect(palabrasIndependientes(xhtml)).toEqual([
      "La",
      "golondrina",
      "se",
      "sintió",
      "muy",
      "solitaria",
      "&",
      "triste.",
      "Otra",
      "línea.",
      "café",
      "árbol",
    ]);
  });

  it("no pega palabras de párrafos distintos", () => {
    expect(palabrasIndependientes("<body><p>uno</p><p>dos</p></body>")).toEqual(["uno", "dos"]);
  });
});

describe("compararPalabras", () => {
  const a =
    "En la parte más alta de la ciudad sobre una columna se alzaba la estatua del Príncipe Feliz".split(
      " ",
    );

  it("secuencias idénticas no tienen diferencias", () => {
    expect(compararPalabras(a, [...a])).toEqual([]);
  });

  it("detecta texto perdido (el caso del normalizador viejo)", () => {
    const sinCola = a.filter((w) => w !== "estatua" && w !== "del");
    const hunks = compararPalabras(a, sinCola);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]?.a).toEqual(["estatua", "del"]);
    expect(hunks[0]?.b).toEqual([]);
  });

  it("detecta inserciones y sustituciones, y separa varias diferencias", () => {
    const b = [...a];
    b.splice(3, 1, "muy");
    b.splice(10, 0, "enorme");
    const hunks = compararPalabras(a, b);
    expect(hunks).toHaveLength(2);
    expect(hunks[0]).toMatchObject({ a: ["más"], b: ["muy"] });
    expect(hunks[1]).toMatchObject({ a: [], b: ["enorme"] });
  });

  it("detecta una cola faltante al final", () => {
    const hunks = compararPalabras(a, a.slice(0, -3));
    expect(hunks).toHaveLength(1);
    expect(hunks[0]?.a).toEqual(a.slice(-3));
  });

  it("describe una diferencia con contexto", () => {
    const [h] = compararPalabras(
      a,
      a.filter((w) => w !== "Feliz"),
    );
    expect(h && describirHunk(h, a)).toContain("⟦A: Feliz⟧ ⟦B: ∅⟧");
  });
});

describe("palabrasDeBloques", () => {
  it("excluye los bloques inyectados y suma el crédito de las firmas", () => {
    const blocks: Block[] = [
      { id: "x-1", page: null, type: "heading", level: 1, text: ["Prólogo"] },
      {
        id: "x-2",
        page: null,
        type: "paragraph",
        text: ["Dos palabras."],
        indent: false,
        align: "justify",
        dropCap: false,
        hash: hashText("Dos palabras."),
        marks: [],
      },
      {
        id: "x-3",
        page: null,
        type: "byline",
        text: ["Ana"],
        credit: "Filósofa",
        hash: hashText("Ana"),
      },
    ];
    expect(palabrasDeBloques(blocks, new Set(["x-1"]))).toEqual([
      "Dos",
      "palabras.",
      "Ana",
      "Filósofa",
    ]);
  });
});
