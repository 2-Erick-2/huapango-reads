import { describe, expect, it } from "vitest";
import { computeStats, hashText } from "./text.ts";
import type { Block, Pieza } from "./types.ts";
import { validatePieza } from "./validate.ts";

function paragraph(id: string, text: string): Block {
  return {
    id,
    page: null,
    type: "paragraph",
    text: [text],
    indent: true,
    align: "justify",
    dropCap: false,
    hash: hashText(text),
    marks: [],
  };
}

function pieza(blocks: Block[], over: Partial<Pieza> = {}): Pieza {
  return {
    version: 1,
    slug: "prueba",
    kind: "libro",
    parentSlug: null,
    title: "Prueba",
    credit: null,
    language: "es-MX",
    blocks,
    stats: computeStats(blocks),
    source: { file: "x.epub", sha256: "0" },
    ...over,
  };
}

const codes = (p: Pieza, assets?: ReadonlySet<string>) =>
  validatePieza(p, assets).map((i) => i.code);

describe("validatePieza", () => {
  it("acepta una pieza sana", () => {
    const p = pieza([
      paragraph("prueba-1", "Primera frase."),
      paragraph("prueba-2", "Segunda frase."),
    ]);
    expect(validatePieza(p)).toEqual([]);
  });

  it("avisa de un párrafo cortado a media frase", () => {
    const p = pieza([paragraph("prueba-1", "la golondrina se sintió")]);
    expect(codes(p)).toContain("posible-corte");
  });

  it("rechaza ids repetidos o sin el slug de la pieza", () => {
    const p = pieza([
      paragraph("prueba-1", "Uno."),
      paragraph("prueba-1", "Dos."),
      paragraph("otra-3", "Tres."),
    ]);
    expect(codes(p)).toEqual(expect.arrayContaining(["id-repetido", "id"]));
  });

  it("rechaza espacios al inicio o final de la pieza y espacios dobles", () => {
    const spacer: Block = { id: "prueba-1", page: null, type: "spacer" };
    expect(codes(pieza([spacer, paragraph("prueba-2", "Hola.")]))).toContain("espacio-borde");
    expect(
      codes(
        pieza([paragraph("prueba-1", "Hola."), { id: "prueba-2", page: null, type: "spacer" }]),
      ),
    ).toContain("espacio-borde");
    expect(codes(pieza([paragraph("prueba-1", "Hola  mundo.")]))).toContain("espacios-dobles");
  });

  it("rechaza caracteres invisibles", () => {
    expect(codes(pieza([paragraph("prueba-1", "so\u00ADlo.")]))).toContain("invisibles");
  });

  it("exige alt a las imágenes informativas y que el archivo exista", () => {
    const image: Block = {
      id: "prueba-1",
      page: null,
      type: "image",
      asset: "a.png",
      alt: "",
      role: "ilustracion",
      decorative: false,
      widthPct: null,
      width: 10,
      height: 10,
    };
    const p = pieza([image, paragraph("prueba-2", "Hola.")]);
    expect(codes(p, new Set(["a.png"]))).toContain("alt");
    expect(codes(p, new Set())).toContain("asset-faltante");
  });

  it("valida que el recorte de una imagen sea una banda dentro de la imagen", () => {
    const image = (crop: { from: number; to: number }): Block => ({
      id: "prueba-1",
      page: null,
      type: "image",
      asset: "a.png",
      alt: "",
      role: "ornamento",
      decorative: true,
      widthPct: 62,
      width: 512,
      height: 853,
      crop,
    });
    const con = (crop: { from: number; to: number }) =>
      codes(pieza([image(crop), paragraph("prueba-2", "Hola.")]), new Set(["a.png"]));
    expect(con({ from: 0.04, to: 0.44 })).toEqual([]);
    expect(con({ from: 0.5, to: 0.4 })).toContain("recorte");
    expect(con({ from: -0.1, to: 0.4 })).toContain("recorte");
    expect(con({ from: 0, to: 1.2 })).toContain("recorte");
  });
  it("detecta huella y estadísticas que no coinciden con el contenido", () => {
    const bad = { ...paragraph("prueba-1", "Hola."), hash: "00000000" } as Block;
    expect(codes(pieza([bad]))).toContain("hash");
    const p = pieza([paragraph("prueba-1", "Hola.")]);
    expect(codes({ ...p, stats: { words: 99, paragraphs: 1, minutes: 1 } })).toContain("stats");
  });

  it("un complemento necesita padre y un libro no puede tenerlo", () => {
    const blocks = [paragraph("prueba-1", "Hola.")];
    expect(codes(pieza(blocks, { kind: "complemento" }))).toContain("padre");
    expect(codes(pieza(blocks, { parentSlug: "otro" }))).toContain("padre");
  });
});
