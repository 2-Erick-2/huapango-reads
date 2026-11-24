/**
 * Conversión entre el formato canónico (`Pieza`) y el documento de ProseMirror, en los dos sentidos.
 *
 * Reglas que hacen que la ida y vuelta sea exacta (probado en `editor.test.ts`):
 *  - Los ids se vuelven a numerar de forma posicional (`<slug>-<n>`), como los genera el importador.
 *  - La huella (`hash`) se recalcula del texto; los saltos de página del impreso (`marks`) solo se
 *    conservan si el texto del párrafo no cambió (si cambió, ya no se sabe dónde caían).
 *  - El texto en línea se normaliza: se unen los fragmentos vecinos con el mismo formato.
 *  - Las marcas se anidan siempre en el mismo orden: negrita > cursiva > versalitas.
 */
import { Fragment, Mark, Node as PMNode } from "prosemirror-model";
import { blockText, computeStats, hashText, plainText } from "~/lib/libro/text";
import type { Align, Block, Inline, PageMark, Pieza } from "~/lib/libro/types";
import { markType, nodeType, schema } from "./schema";

// ---------------------------------------------------------------- texto en línea

type Style = { strong: boolean; em: boolean; smallCaps: boolean };
const NONE: Style = { strong: false, em: false, smallCaps: false };

/** Une fragmentos vecinos con el mismo formato (forma canónica del texto en línea). */
export function normalizeInlines(inlines: readonly Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const node of inlines) {
    if (typeof node === "string") {
      if (node === "") continue;
      const last = out[out.length - 1];
      if (typeof last === "string") out[out.length - 1] = last + node;
      else out.push(node);
      continue;
    }
    const kind = "em" in node ? "em" : "strong" in node ? "strong" : "smallCaps";
    const children = normalizeInlines(
      "em" in node ? node.em : "strong" in node ? node.strong : node.smallCaps,
    );
    if (children.length === 0) continue;
    const last = out[out.length - 1];
    if (last !== undefined && typeof last !== "string" && kind in last) {
      const prev = (last as Record<string, Inline[]>)[kind] ?? [];
      (last as Record<string, Inline[]>)[kind] = normalizeInlines([...prev, ...children]);
    } else {
      out.push({ [kind]: children } as Inline);
    }
  }
  return out;
}

function inlinesToNodes(inlines: readonly Inline[], style: Style = NONE): PMNode[] {
  const nodes: PMNode[] = [];
  for (const node of inlines) {
    if (typeof node === "string") {
      if (node === "") continue;
      const marks: Mark[] = [];
      if (style.strong) marks.push(markType("strong").create());
      if (style.em) marks.push(markType("em").create());
      if (style.smallCaps) marks.push(markType("smallCaps").create());
      nodes.push(schema.text(node, marks));
    } else if ("em" in node) nodes.push(...inlinesToNodes(node.em, { ...style, em: true }));
    else if ("strong" in node)
      nodes.push(...inlinesToNodes(node.strong, { ...style, strong: true }));
    else nodes.push(...inlinesToNodes(node.smallCaps, { ...style, smallCaps: true }));
  }
  return nodes;
}

function nodesToInlines(fragment: Fragment): Inline[] {
  const out: Inline[] = [];
  fragment.forEach((child) => {
    if (!child.isText || !child.text) return;
    let node: Inline = child.text;
    if (child.marks.some((m) => m.type.name === "smallCaps")) node = { smallCaps: [node] };
    if (child.marks.some((m) => m.type.name === "em")) node = { em: [node] };
    if (child.marks.some((m) => m.type.name === "strong")) node = { strong: [node] };
    out.push(node);
  });
  return normalizeInlines(out);
}

// ---------------------------------------------------------------- bloques → documento

function blockToNode(block: Block): PMNode {
  switch (block.type) {
    case "heading":
      return nodeType("heading").create(
        { level: block.level, page: block.page },
        inlinesToNodes(block.text),
      );
    case "paragraph":
      return nodeType("paragraph").create(
        {
          indent: block.indent,
          align: block.align,
          dropCap: block.dropCap,
          page: block.page,
          marks: block.marks,
          orig: block.hash,
        },
        inlinesToNodes(block.text),
      );
    case "byline":
      return nodeType("byline").create(
        { credit: block.credit, page: block.page },
        inlinesToNodes(block.text),
      );
    case "ornament":
      return nodeType("ornament").create(
        { page: block.page },
        block.text === "" ? undefined : schema.text(block.text),
      );
    case "spacer":
      return nodeType("spacer").create({ page: block.page });
    case "image":
      return nodeType("image").create({
        asset: block.asset,
        alt: block.alt,
        role: block.role,
        decorative: block.decorative,
        widthPct: block.widthPct,
        width: block.width,
        height: block.height,
        crop: block.crop ?? null,
        page: block.page,
      });
  }
}

/** El documento de ProseMirror de una pieza. */
export function piezaToDoc(pieza: Pieza): PMNode {
  return nodeType("doc").create(null, pieza.blocks.map(blockToNode));
}

// ---------------------------------------------------------------- documento → bloques

const ALIGNS: readonly Align[] = ["start", "center", "end", "justify"];

/** Convierte el documento de ProseMirror otra vez a bloques canónicos, con ids y huellas nuevos. */
export function docToBlocks(doc: PMNode, slug: string): Block[] {
  const blocks: Block[] = [];
  doc.forEach((node) => {
    const id = `${slug}-${blocks.length + 1}`;
    const page = (node.attrs["page"] as string | null) ?? null;
    switch (node.type.name) {
      case "heading": {
        const level = Math.min(3, Math.max(1, Number(node.attrs["level"]))) as 1 | 2 | 3;
        blocks.push({ id, page, type: "heading", level, text: nodesToInlines(node.content) });
        break;
      }
      case "paragraph": {
        const text = nodesToInlines(node.content);
        const plain = plainText(text);
        const hash = hashText(plain);
        const stored = (node.attrs["marks"] as PageMark[] | undefined) ?? [];
        const align = ALIGNS.includes(node.attrs["align"] as Align)
          ? (node.attrs["align"] as Align)
          : "justify";
        blocks.push({
          id,
          page,
          type: "paragraph",
          text,
          indent: Boolean(node.attrs["indent"]),
          align,
          dropCap: Boolean(node.attrs["dropCap"]),
          hash,
          // Los saltos de página solo valen si el texto sigue siendo el original.
          marks: node.attrs["orig"] === hash ? stored : [],
        });
        break;
      }
      case "byline": {
        const text = nodesToInlines(node.content);
        blocks.push({
          id,
          page,
          type: "byline",
          text,
          credit: (node.attrs["credit"] as string | null) ?? null,
          hash: hashText(plainText(text)),
        });
        break;
      }
      case "ornament":
        blocks.push({ id, page, type: "ornament", text: node.textContent });
        break;
      case "spacer":
        blocks.push({ id, page, type: "spacer" });
        break;
      case "image": {
        const crop = node.attrs["crop"] as { from: number; to: number } | null;
        blocks.push({
          id,
          page,
          type: "image",
          asset: String(node.attrs["asset"]),
          alt: String(node.attrs["alt"]),
          role: node.attrs["role"] as "portadilla" | "ilustracion" | "divisor" | "ornamento",
          decorative: Boolean(node.attrs["decorative"]),
          widthPct: (node.attrs["widthPct"] as number | null) ?? null,
          width: Number(node.attrs["width"]),
          height: Number(node.attrs["height"]),
          ...(crop ? { crop } : {}),
        });
        break;
      }
    }
  });
  return blocks;
}

/** La pieza resultante de editar: mismos metadatos, bloques nuevos y estadísticas recalculadas. */
export function docToPieza(doc: PMNode, base: Pieza): Pieza {
  const blocks = docToBlocks(doc, base.slug);
  const last = blocks[blocks.length - 1];
  // La autoría sale de la firma final. Si la pieza nunca tuvo firma (una obra nueva del panel lleva
  // la autoría desde su creación), se conserva; si tenía firma y se borró, la autoría también se va.
  const hadByline = base.blocks[base.blocks.length - 1]?.type === "byline";
  return {
    ...base,
    blocks,
    credit: last?.type === "byline" ? blockText(last) : hadByline ? null : base.credit,
    stats: computeStats(blocks),
  };
}

/** Lleva un bloque a una forma comparable con `normalizeBlocks` (para pruebas y detección de cambios). */
export function normalizeBlocks(blocks: readonly Block[]): Block[] {
  return blocks.map((b) =>
    b.type === "heading" || b.type === "paragraph" || b.type === "byline"
      ? { ...b, text: normalizeInlines(b.text) }
      : b,
  );
}
