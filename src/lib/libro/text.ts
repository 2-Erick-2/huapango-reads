/**
 * Utilidades puras de texto del formato canónico. Sin dependencias del navegador ni de Node:
 * las usan el importador, el lector y las pruebas.
 */
import type { Block, Inline, PiezaStats } from "./types.ts";

/** Velocidad de lectura en silencio en español, en palabras por minuto. */
export const WORDS_PER_MINUTE = 230;

/** Caracteres invisibles que InDesign deja en el texto y que rompen búsquedas y comparaciones. */
const INVISIBLES = /\p{Cf}/gu;

/**
 * Limpia texto de origen sin tocar el contenido: quita invisibles, normaliza a NFC y colapsa
 * espacios ASCII. Conserva el espacio sin separación (U+00A0): es intencional en la tipografía.
 */
export function cleanText(raw: string): string {
  return raw
    .replace(INVISIBLES, "")
    .normalize("NFC")
    .replace(/[ \t\r\n\f\v]+/g, " ");
}

/** Texto plano de una lista de elementos en línea. */
export function plainText(inlines: readonly Inline[]): string {
  let out = "";
  for (const node of inlines) {
    if (typeof node === "string") out += node;
    else if ("em" in node) out += plainText(node.em);
    else if ("strong" in node) out += plainText(node.strong);
    else out += plainText(node.smallCaps);
  }
  return out;
}

/** Texto legible de un bloque ("" para los que no llevan texto). */
export function blockText(block: Block): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "byline":
      return plainText(block.text);
    case "ornament":
      return block.text;
    case "image":
    case "spacer":
      return "";
  }
}

/** Palabras de un texto, separadas por cualquier espacio (incluido U+00A0). */
export function wordsOf(text: string): string[] {
  return cleanText(text)
    .replace(/[\u00A0\u2000-\u200A\u202F]/g, " ")
    .split(" ")
    .filter((w) => w.length > 0);
}

export function countWords(text: string): number {
  return wordsOf(text).length;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Estadísticas de una pieza. Cuenta títulos, párrafos y firmas. */
export function computeStats(blocks: readonly Block[]): PiezaStats {
  let words = 0;
  let paragraphs = 0;
  for (const block of blocks) {
    words += countWords(blockText(block));
    if (block.type === "paragraph") paragraphs += 1;
  }
  return { words, paragraphs, minutes: readingMinutes(words) };
}

/** Huella FNV-1a de 32 bits en hexadecimal. No es criptográfica: solo para re-anclar texto. */
export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * ¿El párrafo parece cortado a media frase? Un párrafo completo termina en puntuación final,
 * cierre de comillas o paréntesis, o raya de cierre de diálogo. Es una alarma, no una prueba.
 */
export function looksTruncated(text: string): boolean {
  const t = text.trimEnd();
  if (t.length === 0) return false;
  return !/[.!?…"”»)\]’'—:]$/u.test(t);
}
