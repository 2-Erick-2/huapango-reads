/**
 * Árbol XML mínimo sobre `saxes` (parser estricto). El XHTML de un EPUB es XML: se parsea como
 * XML y no como HTML, porque InDesign escribe `<div ... />` autocerrados que un parser HTML
 * trataría como etiquetas abiertas y se tragaría el contenido que sigue.
 */
import { SaxesParser } from "saxes";

export interface XElement {
  kind: "element";
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
  parent: XElement | null;
}

export interface XText {
  kind: "text";
  text: string;
}

export type XNode = XElement | XText;

export function parseXml(xml: string, origin: string): XElement {
  const parser = new SaxesParser();
  let root: XElement | null = null;
  let current: XElement | null = null;
  let failure: Error | null = null;

  parser.on("error", (error) => {
    failure ??= new Error(`XML mal formado en ${origin}: ${error.message}`);
  });
  parser.on("opentag", (tag) => {
    const attrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(tag.attributes)) attrs[key] = String(value);
    const element: XElement = {
      kind: "element",
      name: tag.name,
      attrs,
      children: [],
      parent: current,
    };
    if (current) current.children.push(element);
    else root ??= element;
    current = element;
  });
  parser.on("closetag", () => {
    current = current?.parent ?? null;
  });
  const addText = (text: string) => {
    if (current) current.children.push({ kind: "text", text });
  };
  parser.on("text", addText);
  parser.on("cdata", addText);

  parser.write(xml).close();
  if (failure) throw failure;
  if (!root) throw new Error(`XML sin elemento raíz en ${origin}`);
  return root;
}

/** Valor de un atributo (con su prefijo, p. ej. "epub:type"), o null si no existe. */
export function attr(el: XElement, name: string): string | null {
  return el.attrs[name] ?? null;
}

export function classesOf(el: XElement): string[] {
  return (el.attrs["class"] ?? "").split(/\s+/).filter((c) => c.length > 0);
}

export function elementChildren(el: XElement): XElement[] {
  return el.children.filter((c): c is XElement => c.kind === "element");
}

/** Busca el primer descendiente con ese nombre (en profundidad). */
export function findFirst(el: XElement, name: string): XElement | null {
  for (const child of elementChildren(el)) {
    if (child.name === name) return child;
    const nested = findFirst(child, name);
    if (nested) return nested;
  }
  return null;
}

export function findAll(el: XElement, name: string, out: XElement[] = []): XElement[] {
  for (const child of elementChildren(el)) {
    if (child.name === name) out.push(child);
    findAll(child, name, out);
  }
  return out;
}

export function textContent(node: XNode): string {
  if (node.kind === "text") return node.text;
  return node.children.map(textContent).join("");
}
