/**
 * XHTML de InDesign -> "átomos": párrafos e imágenes en orden de documento, con su estilo ya
 * resuelto desde el CSS. Todavía no hay decisiones editoriales aquí (qué es título, firma, pieza…):
 * eso es de `normalizar.ts` y del mapeo de cada libro.
 *
 * Regla que corrige el normalizador viejo: las marcas de salto de página (`doc-pagebreak`) caen a
 * mitad de una frase. Aquí NUNCA se descarta el texto que sigue a una marca: la marca se anota
 * como posición dentro del párrafo y el texto continúa.
 */
import { cleanText } from "../../src/lib/libro/text.ts";
import type { Align, Inline, PageMark } from "../../src/lib/libro/types.ts";
import { emValue, percentValue, styleFor, type Declarations, type StyleSheet } from "./css.ts";
import type { EpubDoc } from "./epub.ts";
import { attr, classesOf, elementChildren, textContent, type XElement, type XNode } from "./xml.ts";

export interface Warning {
  code: string;
  message: string;
}

export interface ParaAtom {
  kind: "p";
  doc: string;
  tag: string;
  classes: string[];
  id: string | null;
  inlines: Inline[];
  /** Texto plano ya limpio */
  text: string;
  marks: PageMark[];
  /** Página del impreso donde empieza */
  page: string | null;
  align: Align;
  indent: boolean;
  fontSizeEm: number;
  /** Nivel si la etiqueta es h1..h6 */
  headingLevel: 1 | 2 | 3 | null;
}

export interface ImgAtom {
  kind: "img";
  doc: string;
  src: string;
  alt: string;
  widthPct: number | null;
  page: string | null;
}

export type Atom = ParaAtom | ImgAtom;

interface Flags {
  em: boolean;
  strong: boolean;
  smallCaps: boolean;
}

type Item = { t: "text"; text: string; flags: Flags } | { t: "mark"; page: string };

/** Texto de un párrafo corto que se considera "de una sola línea" para alineación de última línea. */
const SHORT_LINE = 80;

const SKIP = new Set(["head", "style", "script", "title", "meta", "link"]);

export function extractAtoms(doc: EpubDoc, warnings: Warning[]): Atom[] {
  const atoms: Atom[] = [];
  let page: string | null = null;

  const unsupported = new Set<string>();
  const noteUnsupported = (name: string) => {
    if (!unsupported.has(name)) {
      unsupported.add(name);
      warnings.push({
        code: "etiqueta-no-soportada",
        message: `<${name}> en ${doc.href}: se lee solo su texto`,
      });
    }
  };

  const walk = (el: XElement, ancestors: XElement[]) => {
    for (const child of el.children) {
      if (child.kind === "text") {
        if (child.text.trim() !== "")
          warnings.push({
            code: "texto-suelto",
            message: `Texto fuera de un párrafo en ${doc.href}: "${child.text.trim().slice(0, 50)}"`,
          });
        continue;
      }
      if (isPageBreak(child)) {
        page = pageLabel(child);
        continue;
      }
      if (SKIP.has(child.name)) continue;

      if (/^h[1-6]$/.test(child.name) || child.name === "p" || child.name === "li") {
        const level = /^h([1-6])$/.exec(child.name)?.[1];
        if (child.name === "li") noteUnsupported("li");
        const para = readParagraph(child, doc, page, level ? clampLevel(Number(level)) : null);
        if (para.endPage !== null) page = para.endPage;
        atoms.push(para.atom);
        for (const img of descendants(child, "img"))
          atoms.push(readImage(img, doc, page, [...ancestors, el, child]));
        if (descendants(child, "img").length > 0)
          warnings.push({
            code: "imagen-en-linea",
            message: `Imagen dentro de un párrafo en ${doc.href}: se emite aparte`,
          });
      } else if (child.name === "img") {
        atoms.push(readImage(child, doc, page, [...ancestors, el]));
      } else {
        if (
          child.name === "table" ||
          child.name === "ul" ||
          child.name === "ol" ||
          child.name === "dl"
        )
          noteUnsupported(child.name);
        walk(child, [...ancestors, el]);
      }
    }
  };

  const body = elementChildren(doc.root).find((c) => c.name === "body");
  if (!body) throw new Error(`${doc.href}: el documento no tiene <body>`);
  walk(body, []);
  return atoms;
}

function clampLevel(n: number): 1 | 2 | 3 {
  return n <= 1 ? 1 : n === 2 ? 2 : 3;
}

export function isPageBreak(el: XElement): boolean {
  const role = attr(el, "role");
  const type = attr(el, "epub:type") ?? "";
  return role === "doc-pagebreak" || type.split(/\s+/).includes("pagebreak");
}

function pageLabel(el: XElement): string | null {
  const label = attr(el, "aria-label") ?? attr(el, "title") ?? textContent(el).trim();
  return label === "" ? null : label;
}

function descendants(el: XElement, name: string, out: XElement[] = []): XElement[] {
  for (const child of elementChildren(el)) {
    if (child.name === name) out.push(child);
    descendants(child, name, out);
  }
  return out;
}

function readImage(img: XElement, doc: EpubDoc, page: string | null, chain: XElement[]): ImgAtom {
  const src = attr(img, "src");
  if (!src) throw new Error(`${doc.href}: <img> sin src`);
  // El ancho del impreso vive en el contenedor (`#_idContainer003 { width: 62.06% }`), no en la imagen.
  let widthPct: number | null = null;
  for (const el of [...chain].reverse()) {
    const decls = styleFor(doc.sheet, { tag: el.name, classes: classesOf(el), id: attr(el, "id") });
    const pct = percentValue(decls["width"]);
    if (pct !== null && pct < 100) {
      widthPct = pct;
      break;
    }
  }
  return { kind: "img", doc: doc.href, src, alt: attr(img, "alt") ?? "", widthPct, page };
}

function readParagraph(
  el: XElement,
  doc: EpubDoc,
  startPage: string | null,
  headingLevel: 1 | 2 | 3 | null,
): { atom: ParaAtom; endPage: string | null } {
  const classes = classesOf(el);
  const id = attr(el, "id");
  const decls = styleFor(doc.sheet, { tag: el.name, classes, id });

  const items: Item[] = [];
  collect(
    el,
    doc.sheet,
    flagsOf(decls, { em: false, strong: false, smallCaps: false }, el.name),
    items,
  );
  const { inlines, text, marks, endPage } = assemble(items);

  const alignDecl = (decls["text-align"] ?? "").toLowerCase();
  const lastDecl = (decls["text-align-last"] ?? "").toLowerCase();
  let align: Align =
    alignDecl === "center"
      ? "center"
      : alignDecl === "right" || alignDecl === "end"
        ? "end"
        : alignDecl === "justify"
          ? "justify"
          : "start";
  // InDesign alinea a la derecha las firmas con "última línea a la derecha" sobre texto justificado.
  if (align === "justify" && text.length <= SHORT_LINE) {
    if (lastDecl === "right" || lastDecl === "end") align = "end";
    else if (lastDecl === "center") align = "center";
  }

  const indentEm = emValue(decls["text-indent"]) ?? 0;
  return {
    atom: {
      kind: "p",
      doc: doc.href,
      tag: el.name,
      classes,
      id,
      inlines,
      text,
      marks,
      page: startPage,
      align,
      indent: indentEm > 0,
      fontSizeEm: emValue(decls["font-size"]) ?? 1,
      headingLevel,
    },
    endPage,
  };
}

/** Recorre el contenido en línea de un párrafo acumulando texto y marcas de página, sin perder nada. */
function collect(el: XElement, sheet: StyleSheet, flags: Flags, out: Item[]): void {
  for (const child of el.children) pushNode(child, sheet, flags, out);
}

function pushNode(node: XNode, sheet: StyleSheet, flags: Flags, out: Item[]): void {
  if (node.kind === "text") {
    out.push({ t: "text", text: node.text, flags });
    return;
  }
  if (isPageBreak(node)) {
    const label = pageLabel(node);
    if (label !== null) out.push({ t: "mark", page: label });
    // Importante: el texto que sigue a la marca vive en los hermanos, no aquí; no se toca.
    return;
  }
  if (node.name === "img") return; // se emite aparte como átomo
  if (node.name === "br") {
    out.push({ t: "text", text: " ", flags });
    return;
  }
  const decls = styleFor(sheet, { tag: node.name, classes: classesOf(node), id: attr(node, "id") });
  const next = flagsOf(decls, flags, node.name);
  for (const child of node.children) pushNode(child, sheet, next, out);
}

function flagsOf(decls: Declarations, parent: Flags, tag: string): Flags {
  const flags = { ...parent };
  if (tag === "em" || tag === "i" || tag === "cite") flags.em = true;
  if (tag === "strong" || tag === "b") flags.strong = true;
  const style = (decls["font-style"] ?? "").toLowerCase();
  if (style === "italic" || style === "oblique") flags.em = true;
  else if (style === "normal" && tag !== "em" && tag !== "i" && tag !== "cite") flags.em = false;
  const weight = (decls["font-weight"] ?? "").toLowerCase();
  const isStrongTag = tag === "strong" || tag === "b";
  if (weight === "bold" || weight === "bolder" || Number(weight) >= 600) {
    flags.strong = true;
  } else if (
    !isStrongTag &&
    (weight === "normal" || weight === "lighter" || (weight !== "" && Number(weight) <= 500))
  ) {
    flags.strong = false;
  }
  const variant = (decls["font-variant"] ?? decls["font-variant-caps"] ?? "").toLowerCase();
  if (variant.includes("small-caps")) flags.smallCaps = true;
  else if (variant === "normal") flags.smallCaps = false;
  return flags;
}

/**
 * Une los fragmentos en texto limpio: quita invisibles, colapsa espacios entre fragmentos y recorta
 * los bordes. Las marcas de página conservan su posición exacta en el texto resultante.
 */
function assemble(items: Item[]): {
  inlines: Inline[];
  text: string;
  marks: PageMark[];
  endPage: string | null;
} {
  const runs: Array<{ text: string; flags: Flags }> = [];
  const marks: PageMark[] = [];
  let length = 0;
  // Empieza en "true" para descartar los espacios del inicio; después evita espacios dobles.
  let lastWasSpace = true;
  let endPage: string | null = null;

  for (const item of items) {
    if (item.t === "mark") {
      marks.push({ offset: length, page: item.page });
      endPage = item.page;
      continue;
    }
    for (const ch of cleanText(item.text)) {
      if (ch === " ") {
        if (lastWasSpace) continue;
        lastWasSpace = true;
      } else {
        lastWasSpace = false;
      }
      const last = runs[runs.length - 1];
      if (last && sameFlags(last.flags, item.flags)) last.text += ch;
      else runs.push({ text: ch, flags: item.flags });
      length += ch.length;
    }
  }

  // Recorta el espacio final; cada espacio conserva el formato del fragmento donde nació.
  const tail = runs[runs.length - 1];
  if (tail?.text.endsWith(" ")) {
    tail.text = tail.text.slice(0, -1);
    length -= 1;
    if (tail.text === "") runs.pop();
  }

  // Una marca al final (después del último texto) se ancla al final del texto.
  const finalMarks = marks.map((m) => ({ ...m, offset: Math.min(m.offset, length) }));
  const text = runs.map((r) => r.text).join("");
  return { inlines: toInlines(runs), text, marks: finalMarks, endPage };
}

function sameFlags(a: Flags, b: Flags): boolean {
  return a.em === b.em && a.strong === b.strong && a.smallCaps === b.smallCaps;
}

function toInlines(runs: Array<{ text: string; flags: Flags }>): Inline[] {
  return runs.map(({ text, flags }) => {
    let node: Inline = text;
    if (flags.smallCaps) node = { smallCaps: [node] };
    if (flags.em) node = { em: [node] };
    if (flags.strong) node = { strong: [node] };
    return node;
  });
}
