import type { Node as PMNode } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { nuevaPieza } from "~/lib/libro/paquete";
import { validatePieza } from "~/lib/libro/validate";
import { enter } from "./comandos";
import { docToPieza, piezaToDoc } from "./convert";
import { nodeType, schema } from "./schema";

const p = (texto: string, attrs: Record<string, unknown> = {}) =>
  nodeType("paragraph").create(attrs, texto ? schema.text(texto) : null);
const h = (texto: string) => nodeType("heading").create({ level: 1 }, schema.text(texto));
const doc = (...hijos: PMNode[]) => nodeType("doc").create(null, hijos);

/** Pone el cursor en `pos` (posición dentro del documento), aplica Enter y escribe `texto`. */
function enterYEscribir(d: PMNode, pos: number, texto = ""): PMNode {
  let state = EditorState.create({ doc: d, selection: TextSelection.create(d, pos) });
  const ok = enter(state, (tr) => {
    state = state.apply(tr);
  });
  expect(ok).toBe(true);
  if (texto) state = state.apply(state.tr.insertText(texto));
  return state.doc;
}

const finDe = (d: PMNode, index: number) => {
  let pos = 0;
  for (let i = 0; i < index; i += 1) pos += d.child(i).nodeSize;
  return pos + d.child(index).nodeSize - 1;
};

describe("Enter en el editor", () => {
  it("al final de un párrafo crea OTRO PÁRRAFO (no un título), con su misma sangría y alineación", () => {
    const d = doc(h("Título"), p("Primer párrafo.", { indent: true, align: "justify" }));
    const r = enterYEscribir(d, finDe(d, 1), "Segundo.");
    expect(r.childCount).toBe(3);
    expect(r.child(2).type.name).toBe("paragraph");
    expect(r.child(2).attrs["indent"]).toBe(true);
    expect(r.child(2).attrs["align"]).toBe("justify");
    expect(r.child(2).textContent).toBe("Segundo.");
  });

  it("tras el primer párrafo (sin sangría) los siguientes llevan sangría; un verso centrado sigue centrado", () => {
    const d = doc(h("Título"), p("Primero.", { indent: false, align: "justify" }));
    expect(enterYEscribir(d, finDe(d, 1), "Segundo.").child(2).attrs["indent"]).toBe(true);
    const verso = doc(p("Golondrina, golondrina...", { indent: false, align: "center" }));
    const r = enterYEscribir(verso, finDe(verso, 0), "Otro verso.");
    expect(r.child(1).attrs).toMatchObject({ align: "center", indent: false });
  });

  it("el párrafo nuevo no hereda capitular ni marcas de página del impreso", () => {
    const d = doc(
      p("Con capitular.", {
        dropCap: true,
        page: "7",
        marks: [{ offset: 3, page: "8" }],
        orig: "abc",
      }),
    );
    const r = enterYEscribir(d, finDe(d, 0));
    const nuevo = r.child(1);
    expect(nuevo.attrs["dropCap"]).toBe(false);
    expect(nuevo.attrs["page"]).toBeNull();
    expect(nuevo.attrs["marks"]).toEqual([]);
    expect(nuevo.attrs["orig"]).toBeNull();
  });

  it("al final de un título crea un párrafo sin sangría (como en el libro)", () => {
    const d = doc(h("Capítulo uno"));
    const r = enterYEscribir(d, finDe(d, 0), "Texto.");
    expect(r.child(1).type.name).toBe("paragraph");
    expect(r.child(1).attrs["indent"]).toBe(false);
  });

  it("partir un título a la mitad conserva los dos como título", () => {
    const d = doc(h("Capítulo uno"));
    const r = enterYEscribir(d, 1 + "Capítulo".length);
    expect([r.child(0).type.name, r.child(1).type.name]).toEqual(["heading", "heading"]);
  });

  it("una obra nueva escrita con Enter queda como párrafos válidos", () => {
    const base = nuevaPieza({
      slug: "prueba",
      title: "Prueba",
      kind: "ensayo",
      parentSlug: null,
      credit: "Ana Ruiz",
    });
    let d = piezaToDoc(base);
    let state = EditorState.create({ doc: d, selection: TextSelection.create(d, finDe(d, 1)) });
    state = state.apply(state.tr.insertText("Uno."));
    for (const texto of ["Dos.", "Tres."]) {
      enter(state, (tr) => {
        state = state.apply(tr);
      });
      state = state.apply(state.tr.insertText(texto));
    }
    d = state.doc;
    const pieza = docToPieza(d, base);
    expect(pieza.blocks.map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
      "paragraph",
    ]);
    expect(validatePieza(pieza)).toEqual([]);
  });
});

describe("pegar desde Word o Google Docs", () => {
  it("el bloque por omisión del documento es el párrafo", () => {
    expect(nodeType("doc").contentMatch.defaultType?.name).toBe("paragraph");
  });
});
