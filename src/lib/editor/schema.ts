/**
 * Esquema de ProseMirror del editor de la editorial: **cada bloque del formato canónico es un nodo**
 * (ADR 0018). Así lo que se edita es exactamente lo que el lector pinta, y la conversión de ida y
 * vuelta no pierde nada (la prueba `editor.test.ts` lo exige sobre los libros reales).
 *
 * Los atributos que el editor no muestra (`page`, `marks`, `orig`, recorte de imagen…) se conservan en
 * el nodo para que sobrevivan a una sesión de edición.
 */
import { Schema, type MarkSpec, type NodeSpec } from "prosemirror-model";

const ALINEACIONES: ReadonlySet<string> = new Set(["start", "center", "end", "justify"]);
const ALINEACION_CSS: Record<string, string> = {
  left: "start",
  start: "start",
  center: "center",
  right: "end",
  end: "end",
  justify: "justify",
};

const nodes: Record<string, NodeSpec> = {
  doc: { content: "block+" },

  // El párrafo va PRIMERO: es el bloque que el editor crea por omisión (Enter, pegar, documento vacío).
  paragraph: {
    group: "block",
    content: "inline*",
    attrs: {
      indent: { default: true },
      align: { default: "justify" },
      dropCap: { default: false },
      page: { default: null },
      /** Saltos de página del impreso dentro del párrafo (solo se conservan si el texto no cambia) */
      marks: { default: [] },
      /** Huella del texto original, para saber si `marks` sigue siendo válido */
      orig: { default: null },
    },
    // Al pegar (desde el propio editor, Word o Google Docs) se conservan sangría y alineación.
    parseDOM: [
      {
        tag: "p",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const leida = el.dataset["align"] ?? ALINEACION_CSS[el.style.textAlign] ?? "justify";
          const align = ALINEACIONES.has(leida) ? leida : "justify";
          const prosa = align === "justify" || align === "start";
          // Sangría solo en prosa: un texto centrado o a la derecha nunca la lleva.
          return { indent: prosa && el.dataset["indent"] !== "false", align, dropCap: false };
        },
      },
    ],
    toDOM: (node) => [
      "p",
      {
        "data-indent": node.attrs["indent"] ? "true" : "false",
        "data-align": String(node.attrs["align"]),
        "data-dropcap": node.attrs["dropCap"] ? "true" : "false",
      },
      0,
    ],
  },

  heading: {
    group: "block",
    content: "inline*",
    defining: true,
    attrs: { level: { default: 1 }, page: { default: null } },
    parseDOM: [1, 2, 3].map((level) => ({ tag: `h${level}`, attrs: { level } })),
    toDOM: (node) => [`h${Math.min(3, Math.max(1, Number(node.attrs["level"])))}`, 0],
  },

  /** Firma al final de un texto: el nombre se edita en el cuerpo y su línea de crédito es un atributo. */
  byline: {
    group: "block",
    content: "inline*",
    attrs: { credit: { default: null }, page: { default: null } },
    toDOM: () => ["p", { class: "pm-byline" }, 0],
  },

  ornament: {
    group: "block",
    content: "text*",
    marks: "",
    attrs: { page: { default: null } },
    toDOM: () => ["p", { class: "pm-ornament" }, 0],
  },

  spacer: {
    group: "block",
    atom: true,
    selectable: true,
    attrs: { page: { default: null } },
    toDOM: () => ["div", { class: "pm-spacer", "aria-label": "Pausa entre escenas" }],
  },

  image: {
    group: "block",
    atom: true,
    selectable: true,
    draggable: false,
    attrs: {
      asset: { default: "" },
      alt: { default: "" },
      role: { default: "ilustracion" },
      decorative: { default: true },
      widthPct: { default: null },
      width: { default: 1 },
      height: { default: 1 },
      crop: { default: null },
      page: { default: null },
    },
    // La URL real de la imagen depende de la obra: la resuelve el NodeView del editor.
    toDOM: (node) => ["figure", { class: "pm-image", "data-asset": String(node.attrs["asset"]) }],
  },

  text: { group: "inline" },
};

const marks: Record<string, MarkSpec> = {
  em: { parseDOM: [{ tag: "em" }, { tag: "i" }], toDOM: () => ["em", 0] },
  strong: { parseDOM: [{ tag: "strong" }, { tag: "b" }], toDOM: () => ["strong", 0] },
  smallCaps: {
    parseDOM: [{ tag: "span.small-caps" }],
    toDOM: () => ["span", { class: "small-caps" }, 0],
  },
};

export const schema = new Schema({ nodes, marks });

export function nodeType(name: string) {
  const type = schema.nodes[name];
  if (!type) throw new Error(`El esquema no tiene el nodo "${name}"`);
  return type;
}

export function markType(name: string) {
  const type = schema.marks[name];
  if (!type) throw new Error(`El esquema no tiene la marca "${name}"`);
  return type;
}
