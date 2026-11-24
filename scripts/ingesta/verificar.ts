/**
 * Verificación de integridad: demuestra que no se perdió ni se duplicó texto al importar.
 *
 * La idea es contar las palabras del XHTML por un camino que no comparte código con el parser
 * (quitar etiquetas con expresiones regulares) y exigir que coincidan EXACTAMENTE, en orden, con
 * lo que extrajo el importador. Así, un error como el del normalizador viejo (perder el texto que
 * sigue a una marca de página) no puede pasar sin que falle.
 */
import { blockText, wordsOf } from "../../src/lib/libro/text.ts";
import type { Block } from "../../src/lib/libro/types.ts";
import type { ParaAtom } from "./atoms.ts";
import type { Draft } from "./normalizar.ts";

export interface Check {
  nombre: string;
  /** "error" detiene la importación; "advertencia" se informa pero no la detiene */
  nivel: "error" | "advertencia";
  ok: boolean;
  detalle: string;
}

export interface Hunk {
  /** Posición (en palabras) en la secuencia A */
  at: number;
  a: string[];
  b: string[];
}

const PAGEBREAK = String.raw`(?:doc-pagebreak|epub:type="pagebreak")`;

/** Palabras de un XHTML contadas quitando etiquetas, sin usar el árbol del parser. */
export function palabrasIndependientes(raw: string): string[] {
  let s = raw
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<head[\s>][\s\S]*?<\/head>/gi, "")
    .replace(/<(style|script)[\s>][\s\S]*?<\/\1>/gi, "");
  s = s
    .replace(new RegExp(String.raw`<(span|div)\b[^>]*${PAGEBREAK}[^>]*\/>`, "g"), "")
    .replace(new RegExp(String.raw`<(span|div)\b[^>]*${PAGEBREAK}[^>]*>[\s\S]*?<\/\1>`, "g"), "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?(?:p|div|h[1-6]|li|section|figure|figcaption|blockquote|tr|td|th)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "");
  return wordsOf(decodeEntities(s));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function palabrasDeParrafos(paragraphs: readonly ParaAtom[]): string[] {
  return paragraphs.flatMap((p) => wordsOf(p.text));
}

export function palabrasDeBorradores(drafts: readonly Draft[]): string[] {
  return drafts.flatMap((d) => {
    switch (d.type) {
      case "byline":
        return wordsOf(d.credit === null ? d.text : `${d.text} ${d.credit}`);
      case "spacer":
        return [];
      default:
        return wordsOf(d.text);
    }
  });
}

export function palabrasDeBloques(
  blocks: readonly Block[],
  injected: ReadonlySet<string>,
): string[] {
  return blocks.flatMap((b) => {
    if (injected.has(b.id)) return [];
    const text =
      b.type === "byline" && b.credit !== null ? `${blockText(b)} ${b.credit}` : blockText(b);
    return wordsOf(text);
  });
}

/**
 * Diferencias entre dos secuencias de palabras. Tras cada diferencia busca el siguiente punto donde
 * vuelven a coincidir 4 palabras seguidas, así que reporta varias diferencias separadas.
 */
export function compararPalabras(
  a: readonly string[],
  b: readonly string[],
  maxHunks = 25,
): Hunk[] {
  const K = 4;
  const WINDOW = 600;
  const hunks: Hunk[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length && hunks.length < maxHunks) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    let found: [number, number] | null = null;
    for (let s = 1; s <= 2 * WINDOW && found === null; s++) {
      for (let di = 0; di <= s; di++) {
        const dj = s - di;
        if (di > WINDOW || dj > WINDOW) continue;
        if (coinciden(a, i + di, b, j + dj, K)) {
          found = [di, dj];
          break;
        }
      }
    }
    const [di, dj] = found ?? [a.length - i, b.length - j];
    hunks.push({ at: i, a: a.slice(i, i + di), b: b.slice(j, j + dj) });
    i += di;
    j += dj;
  }
  if ((i < a.length || j < b.length) && hunks.length < maxHunks) {
    hunks.push({ at: i, a: a.slice(i), b: b.slice(j) });
  }
  return hunks;
}

function coinciden(
  a: readonly string[],
  ia: number,
  b: readonly string[],
  ib: number,
  k: number,
): boolean {
  for (let n = 0; n < k; n++) {
    const x = a[ia + n];
    const y = b[ib + n];
    if (x === undefined && y === undefined) return true;
    if (x !== y) return false;
  }
  return true;
}

export function describirHunk(h: Hunk, contexto: readonly string[]): string {
  const before = contexto.slice(Math.max(0, h.at - 6), h.at).join(" ");
  const cut = (w: string[]) =>
    w.length > 14 ? `${w.slice(0, 14).join(" ")} … (+${w.length - 14} palabras)` : w.join(" ");
  return `…${before} ⟦A: ${cut(h.a) || "∅"}⟧ ⟦B: ${cut(h.b) || "∅"}⟧`;
}

export function check(nombre: string, nivel: Check["nivel"], ok: boolean, detalle: string): Check {
  return { nombre, nivel, ok, detalle };
}
