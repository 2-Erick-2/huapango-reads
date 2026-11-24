import { describe, expect, it } from "vitest";
import { extractAtoms, type Atom, type ParaAtom, type Warning } from "./atoms.ts";
import { parseCss } from "./css.ts";
import type { EpubDoc } from "./epub.ts";
import { parseXml } from "./xml.ts";

function docFrom(body: string, css = ""): EpubDoc {
  const raw = `<?xml version="1.0"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>t</title></head><body>${body}</body></html>`;
  return { href: "d.xhtml", raw, root: parseXml(raw, "d.xhtml"), sheet: parseCss(css) };
}

function paragraphs(body: string, css = "", warnings: Warning[] = []): ParaAtom[] {
  return extractAtoms(docFrom(body, css), warnings).filter((a): a is ParaAtom => a.kind === "p");
}

describe("marcas de página a mitad de frase (error del normalizador viejo)", () => {
  it("conserva TODO el texto que sigue a la marca y anota su posición", () => {
    const [p] = paragraphs(
      `<p><span>La golondrina se sintió <span id="p5" role="doc-pagebreak" aria-label="5" epub:type="pagebreak"/>muy solitaria, y empezó a cansarse.</span></p>`,
    );
    expect(p?.text).toBe("La golondrina se sintió muy solitaria, y empezó a cansarse.");
    expect(p?.marks).toEqual([{ offset: 24, page: "5" }]);
    expect(p?.text.slice(24)).toMatch(/^muy solitaria/);
  });

  it("también funciona si la marca es un div dentro del párrafo, o parte una palabra", () => {
    const [p] = paragraphs(`<p>so<div role="doc-pagebreak" aria-label="9"/>litaria</p>`);
    expect(p?.text).toBe("solitaria");
    expect(p?.marks).toEqual([{ offset: 2, page: "9" }]);
  });

  it("la página de un párrafo es la última marca vista antes de él", () => {
    const ps = paragraphs(
      `<div role="doc-pagebreak" aria-label="B1"/><p>Uno.</p><p>Dos <span role="doc-pagebreak" aria-label="B2"/>sigue.</p><p>Tres.</p>`,
    );
    expect(ps.map((p) => p.page)).toEqual(["B1", "B1", "B2"]);
  });
});

describe("limpieza de texto", () => {
  it("colapsa espacios entre fragmentos, quita invisibles y conserva NBSP", () => {
    const [p] = paragraphs(`<p>\n  <span>Hola </span>\n <span>  mun\u00ADdo</span>\u00A0fin </p>`);
    expect(p?.text).toBe("Hola mundo\u00A0fin");
  });

  it("un <br/> equivale a un espacio", () => {
    expect(paragraphs(`<p>uno<br/>dos</p>`)[0]?.text).toBe("uno dos");
  });

  it("un párrafo vacío queda con texto vacío (luego será un espacio)", () => {
    expect(paragraphs(`<p> <span> </span> </p>`)[0]?.text).toBe("");
  });
});

describe("estilos resueltos desde el CSS", () => {
  const css = `
    p.base { text-align: justify; text-indent: 1.167em; -epub-hyphens: none; }
    p.firma { text-align: justify; -epub-text-align-last: right; }
    p.centro { text-align: center; }
    span.k { font-style: italic; }
    span.n { font-weight: bold; }
    span.v { font-variant: small-caps; }
    #cont { width: 62.06%; }
  `;

  it("sangría y alineación", () => {
    const [p] = paragraphs(`<p class="base">Texto</p>`, css);
    expect(p?.indent).toBe(true);
    expect(p?.align).toBe("justify");
    expect(paragraphs(`<p class="centro">Hola</p>`, css)[0]?.align).toBe("center");
  });

  it("'última línea a la derecha' en un texto corto es una firma alineada a la derecha", () => {
    expect(paragraphs(`<p class="firma">Ángelus</p>`, css)[0]?.align).toBe("end");
    const largo = "palabra ".repeat(20).trim();
    expect(paragraphs(`<p class="firma">${largo}</p>`, css)[0]?.align).toBe("justify");
  });

  it("énfasis desde el CSS y desde etiquetas", () => {
    const [p] = paragraphs(
      `<p>Era <span class="k">muy</span> <span class="n">feliz</span> y <em>dulce</em> <span class="v">Nota</span>.</p>`,
      css,
    );
    expect(p?.inlines).toEqual([
      "Era ",
      { em: ["muy"] },
      " ",
      { strong: ["feliz"] },
      " y ",
      { em: ["dulce"] },
      " ",
      { smallCaps: ["Nota"] },
      ".",
    ]);
  });

  it("el ancho de una imagen sale de su contenedor, no de la imagen", () => {
    const atoms: Atom[] = extractAtoms(
      docFrom(`<div><div id="cont"><img src="a.png" alt=""/></div></div>`, css),
      [],
    );
    expect(atoms[0]).toMatchObject({ kind: "img", src: "a.png", widthPct: 62.06 });
  });
});

describe("avisos", () => {
  it("avisa de texto suelto y de etiquetas no soportadas, en vez de ignorarlos en silencio", () => {
    const warnings: Warning[] = [];
    paragraphs(`texto suelto<table><tr><td><p>celda</p></td></tr></table>`, "", warnings);
    expect(warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(["texto-suelto", "etiqueta-no-soportada"]),
    );
  });

  it("falla con XML mal formado", () => {
    expect(() => parseXml("<html><body><p>sin cerrar</body></html>", "malo.xhtml")).toThrow(
      /mal formado/,
    );
  });
});
