/**
 * Intérprete mínimo de CSS para los EPUB que exporta InDesign: reglas planas con selectores
 * `etiqueta`, `.clase`, `etiqueta.clase`, `#id` y combinaciones sin descendientes.
 *
 * No intenta ser un motor de CSS. Lo que no entiende (descendientes, `@media`) se registra en
 * `unsupported` para que el informe de importación lo muestre, en vez de ignorarlo en silencio.
 */

export type Declarations = Record<string, string>;

interface Rule {
  tag: string | null;
  cls: string | null;
  id: string | null;
  decls: Declarations;
  specificity: number;
  order: number;
}

export interface StyleSheet {
  rules: Rule[];
  unsupported: string[];
}

export interface Target {
  tag: string;
  classes: readonly string[];
  id: string | null;
}

const COMPOUND = /^([a-zA-Z][\w-]*)?(?:\.([\w-]+))?(?:#([\w-]+))?$/;

export function parseCss(css: string): StyleSheet {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const sheet: StyleSheet = { rules: [], unsupported: [] };
  let i = 0;
  let order = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open < 0) break;
    const close = matchingBrace(text, open);
    const selector = text.slice(i, open).trim();
    const body = text.slice(open + 1, close);
    i = close + 1;
    if (selector === "") continue;
    if (selector.startsWith("@")) {
      const name = selector.split(/\s+/)[0] ?? selector;
      if (name !== "@font-face" && name !== "@page") sheet.unsupported.push(selector);
      continue;
    }
    const decls = parseDeclarations(body);
    for (const part of selector.split(",")) {
      const compound = COMPOUND.exec(part.trim());
      if (!compound || part.trim() === "") {
        sheet.unsupported.push(part.trim());
        continue;
      }
      const [, tag, cls, id] = compound;
      sheet.rules.push({
        tag: tag?.toLowerCase() ?? null,
        cls: cls ?? null,
        id: id ?? null,
        decls,
        specificity: (id ? 100 : 0) + (cls ? 10 : 0) + (tag ? 1 : 0),
        order: order++,
      });
    }
  }
  return sheet;
}

function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return text.length;
}

function parseDeclarations(body: string): Declarations {
  const out: Declarations = {};
  for (const piece of body.split(";")) {
    const colon = piece.indexOf(":");
    if (colon < 0) continue;
    const prop = piece
      .slice(0, colon)
      .trim()
      .toLowerCase()
      .replace(/^-(?:epub|webkit|moz|ms)-/, "");
    const value = piece
      .slice(colon + 1)
      .replace(/!important/gi, "")
      .trim();
    if (prop !== "" && value !== "") out[prop] = value;
  }
  return out;
}

/** Declaraciones que aplican a un elemento, de menor a mayor especificidad. */
export function styleFor(sheet: StyleSheet, target: Target): Declarations {
  const matching = sheet.rules.filter(
    (r) =>
      (r.tag === null || r.tag === target.tag) &&
      (r.cls === null || target.classes.includes(r.cls)) &&
      (r.id === null || r.id === target.id),
  );
  matching.sort((a, b) => a.specificity - b.specificity || a.order - b.order);
  const merged: Declarations = {};
  for (const rule of matching) Object.assign(merged, rule.decls);
  return merged;
}

/** "1.167em" -> 1.167, "0" -> 0, otra unidad -> null. */
export function emValue(value: string | undefined): number | null {
  if (value === undefined) return null;
  const v = value.trim();
  if (/^0(?:\.0+)?(?:em|px|pt|%)?$/.test(v)) return 0;
  const m = /^(-?\d+(?:\.\d+)?)em$/.exec(v);
  return m?.[1] !== undefined ? Number(m[1]) : null;
}

/** "62.06%" -> 62.06, otra cosa -> null. */
export function percentValue(value: string | undefined): number | null {
  if (value === undefined) return null;
  const m = /^(\d+(?:\.\d+)?)%$/.exec(value.trim());
  return m?.[1] !== undefined ? Number(m[1]) : null;
}
