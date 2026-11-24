import { describe, expect, it } from "vitest";
import { docToPieza, piezaToDoc } from "~/lib/editor/convert";
import { manifestDePaquete, nuevaObra, nuevaPieza, slugify, validarPaquete } from "./paquete";
import { validatePieza } from "./validate";

const ensayo = () =>
  nuevaObra({
    tipo: "ensayo",
    titulo: "El poder de la sombra",
    autores: ["Ana Ruiz"],
    sinopsis: "Sobre la sombra.",
  });

describe("slugify", () => {
  it("quita acentos y signos", () => {
    expect(slugify("El poder de la sombra")).toBe("el-poder-de-la-sombra");
    expect(slugify("¿Qué es la niñez? Ñandú")).toBe("que-es-la-ninez-nandu");
    expect(slugify("  --  ")).toBe("");
  });
  it("acota la longitud sin dejar guion al final", () => {
    const s = slugify("palabra ".repeat(20));
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("obra nueva", () => {
  it("crea un ensayo con su pieza lista para escribir y la autoría como firma", () => {
    const o = ensayo();
    expect(o.obra).toBe("el-poder-de-la-sombra");
    expect(o.piezas[0]?.kind).toBe("ensayo");
    expect(o.piezas[0]?.credit).toBe("Ana Ruiz");
    expect(o.piezas[0]?.blocks[0]?.type).toBe("heading");
  });

  it("recién creada solo falla por estar vacía; con texto queda lista", () => {
    const o = ensayo();
    expect(validarPaquete(o).join("|")).toContain("Párrafo vacío");
    const base = o.piezas[0];
    if (!base) throw new Error("sin pieza");
    const doc = piezaToDoc(base);
    const p = doc.child(1);
    const escrito = doc.copy(
      doc.content.replaceChild(
        1,
        p.type.create(p.attrs, doc.type.schema.text("La sombra también es un lugar.")),
      ),
    );
    const pieza = docToPieza(escrito, base);
    expect(pieza.credit).toBe("Ana Ruiz");
    expect(validatePieza(pieza)).toEqual([]);
    const lista = { ...o, piezas: [pieza] };
    expect(validarPaquete(lista)).toEqual([]);
    expect(manifestDePaquete(lista)).toMatchObject({
      obra: "el-poder-de-la-sombra",
      summary: "Sobre la sombra.",
      authors: ["Ana Ruiz"],
      pieces: [{ kind: "ensayo", credit: "Ana Ruiz" }],
    });
  });

  it("detecta una estructura incorrecta", () => {
    const o = ensayo();
    expect(validarPaquete({ ...o, piezas: [] })).toContain("La obra no tiene piezas");
    expect(validarPaquete({ ...o, tipo: "libro" }).join("|")).toContain('debe ser de tipo "libro"');
    const extra = nuevaPieza({
      slug: "el-poder-de-la-sombra-nota",
      title: "Nota",
      kind: "complemento",
      parentSlug: "el-poder-de-la-sombra",
      credit: null,
    });
    expect(validarPaquete({ ...o, piezas: [...o.piezas, extra] }).join("|")).toContain(
      "Un ensayo es de una sola pieza",
    );
  });
});
