import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { blockText, hashText } from "~/lib/libro/text";
import type { Manifest, Pieza } from "~/lib/libro/types";
import { validatePieza } from "~/lib/libro/validate";
import { docToBlocks, docToPieza, normalizeBlocks, normalizeInlines, piezaToDoc } from "./convert";
import { markType, schema } from "./schema";

const publico = resolve(process.cwd(), "public", "contenido");
const obras = existsSync(publico)
  ? readdirSync(publico).filter((d) => existsSync(join(publico, d, "manifest.json")))
  : [];
const piezas: Pieza[] = obras.flatMap((obra) => {
  const manifest = JSON.parse(
    readFileSync(join(publico, obra, "manifest.json"), "utf8"),
  ) as Manifest;
  return manifest.pieces.map(
    (p) => JSON.parse(readFileSync(join(publico, obra, p.file), "utf8")) as Pieza,
  );
});

describe("ida y vuelta entre la pieza y el documento del editor", () => {
  it("hay piezas reales contra las que probar", () => {
    expect(piezas.length).toBeGreaterThanOrEqual(8);
  });

  for (const pieza of piezas) {
    it(`"${pieza.slug}" sale idéntica: ${pieza.blocks.length} bloques, sin perder texto, imágenes ni marcas`, () => {
      const doc = piezaToDoc(pieza);
      doc.check(); // el documento cumple el esquema
      const back = docToBlocks(doc, pieza.slug);
      expect(back).toEqual(normalizeBlocks(pieza.blocks));
    });

    it(`"${pieza.slug}" sobrevive a serializar el documento a JSON y volver`, () => {
      const doc = piezaToDoc(pieza);
      const again = schema.nodeFromJSON(JSON.parse(JSON.stringify(doc.toJSON())));
      expect(again.eq(doc)).toBe(true);
    });

    it(`"${pieza.slug}" sigue siendo una pieza válida tras la ida y vuelta`, () => {
      const rebuilt = docToPieza(piezaToDoc(pieza), pieza);
      const assets = new Set(pieza.blocks.flatMap((b) => (b.type === "image" ? [b.asset] : [])));
      expect(validatePieza(rebuilt, assets)).toEqual([]);
      expect(rebuilt.stats).toEqual(pieza.stats);
      expect(rebuilt.credit).toBe(pieza.credit);
    });
  }
});

describe("normalizeInlines", () => {
  it("une fragmentos vecinos con el mismo formato", () => {
    expect(normalizeInlines(["a", "b", { em: ["c"] }, { em: ["d"] }, "e"])).toEqual([
      "ab",
      { em: ["cd"] },
      "e",
    ]);
    expect(normalizeInlines(["", { em: [] }, "x"])).toEqual(["x"]);
  });
});

describe("editar", () => {
  const base = piezas.find((p) => p.slug === "el-principe-feliz") as Pieza;
  const firstParagraph = (doc: ReturnType<typeof piezaToDoc>) => {
    let found = -1;
    doc.forEach((node, offset) => {
      if (found < 0 && node.type.name === "paragraph") found = offset;
    });
    return found;
  };

  it("escribir en un párrafo cambia su texto y su huella, y recalcula las estadísticas", () => {
    const doc = piezaToDoc(base);
    const start = firstParagraph(doc);
    let state = EditorState.create({ doc });
    state = state.apply(state.tr.insertText("Había una vez… ", start + 1));
    const edited = docToPieza(state.doc, base);
    const p = edited.blocks.find((b) => b.type === "paragraph");
    expect(p && blockText(p).startsWith("Había una vez… En la parte más alta")).toBe(true);
    expect(p && p.type === "paragraph" && p.hash).toBe(hashText(p ? blockText(p) : ""));
    expect(edited.stats.words).toBe(base.stats.words + 3);
    expect(edited.blocks.map((b) => b.id)).toEqual(
      base.blocks.map((_, i) => `${base.slug}-${i + 1}`),
    );
  });

  it("un párrafo editado pierde sus saltos de página del impreso; uno sin tocar los conserva", () => {
    const conMarcas = base.blocks.findIndex((b) => b.type === "paragraph" && b.marks.length > 0);
    expect(conMarcas).toBeGreaterThanOrEqual(0);
    const doc = piezaToDoc(base);
    // Se edita ese párrafo
    let offset = 0;
    doc.forEach((_node, o, i) => {
      if (i === conMarcas) offset = o;
    });
    let state = EditorState.create({ doc });
    state = state.apply(state.tr.insertText("X", offset + 1));
    const edited = docToPieza(state.doc, base).blocks;
    const untouched = docToPieza(doc, base).blocks;
    const before = base.blocks[conMarcas];
    expect(untouched[conMarcas]).toMatchObject({
      marks: before && before.type === "paragraph" ? before.marks : [],
    });
    expect(edited[conMarcas]).toMatchObject({ marks: [] });
  });

  it("aplicar cursiva queda guardado como texto en línea canónico", () => {
    const doc = piezaToDoc(base);
    const start = firstParagraph(doc);
    let state = EditorState.create({ doc });
    state = state.apply(state.tr.addMark(start + 1, start + 7, markType("em").create()));
    const p = docToPieza(state.doc, base).blocks.find((b) => b.type === "paragraph");
    expect(p && p.type === "paragraph" && p.text[0]).toEqual({ em: ["En la "] });
  });
});
