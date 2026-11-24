/**
 * Átomos -> flujo de borradores (`Draft`) según el mapeo del libro. Aquí se decide qué es título,
 * párrafo, firma, ornamento o espacio. No se descarta texto salvo lo que el mapeo marca como
 * "ignorar", y eso queda registrado para el informe.
 */
import type { Align, Inline, PageMark } from "../../src/lib/libro/types.ts";
import type { Atom, ImgAtom, ParaAtom, Warning } from "./atoms.ts";
import type { FuenteMapeo, RolClase } from "./mapeo.ts";

export type Draft =
  | { type: "heading"; level: 1 | 2 | 3; inlines: Inline[]; text: string; page: string | null }
  | {
      type: "paragraph";
      inlines: Inline[];
      text: string;
      indent: boolean;
      align: Align;
      marks: PageMark[];
      page: string | null;
    }
  | { type: "byline"; inlines: Inline[]; text: string; credit: string | null; page: string | null }
  | { type: "ornament"; text: string; page: string | null }
  | { type: "spacer"; page: string | null };

export interface Stream {
  drafts: Draft[];
  /** Párrafos que el mapeo marca como "ignorar" (colofón, "próximos lanzamientos"…) */
  ignored: ParaAtom[];
  images: ImgAtom[];
  /** Todos los párrafos del origen, en orden (incluye ignorados) */
  paragraphs: ParaAtom[];
}

/** Una firma más larga que esto se trata como párrafo. */
const MAX_BYLINE = 80;

type Rol = RolClase | "espacio" | "ornamento";

export function normalizar(
  atoms: readonly Atom[],
  fuente: FuenteMapeo,
  warnings: Warning[],
): Stream {
  const drafts: Draft[] = [];
  const ignored: ParaAtom[] = [];
  const images: ImgAtom[] = [];
  const paragraphs: ParaAtom[] = [];

  for (const atom of atoms) {
    if (atom.kind === "img") {
      images.push(atom);
      continue;
    }
    paragraphs.push(atom);
    const rol = rolDe(atom, fuente);
    switch (rol) {
      case "ignorar":
        ignored.push(atom);
        break;
      case "espacio":
        drafts.push({ type: "spacer", page: atom.page });
        break;
      case "ornamento":
        drafts.push({ type: "ornament", text: atom.text, page: atom.page });
        break;
      case "titulo1":
      case "titulo2":
        drafts.push({
          type: "heading",
          level: atom.headingLevel ?? (rol === "titulo1" ? 1 : 2),
          inlines: atom.inlines,
          text: atom.text,
          page: atom.page,
        });
        break;
      case "firma": {
        const previous = drafts[drafts.length - 1];
        if (previous?.type === "byline") {
          if (previous.credit === null) previous.credit = atom.text;
          else {
            previous.credit += ` · ${atom.text}`;
            warnings.push({
              code: "firma-larga",
              message: `Más de dos líneas de firma seguidas: "${previous.text}"`,
            });
          }
        } else {
          drafts.push({
            type: "byline",
            inlines: atom.inlines,
            text: atom.text,
            credit: null,
            page: atom.page,
          });
        }
        break;
      }
      case "parrafo":
        drafts.push({
          type: "paragraph",
          inlines: atom.inlines,
          text: atom.text,
          indent: atom.indent,
          align: atom.align,
          marks: atom.marks,
          page: atom.page,
        });
        break;
    }
  }
  return { drafts, ignored, images, paragraphs };
}

/** Prioridad: texto exacto > clase > etiqueta de título > alineación a la derecha > párrafo. */
function rolDe(atom: ParaAtom, fuente: FuenteMapeo): Rol {
  const porTexto = atom.text === "" ? undefined : fuente.textos[atom.text];
  const porClase = atom.classes.map((c) => fuente.clases[c]).find((r) => r !== undefined);
  if (porTexto === "ignorar" || (porTexto === undefined && porClase === "ignorar"))
    return "ignorar";
  if (atom.text === "") return "espacio";
  if (porTexto === "ornamento") return "ornamento";
  const declared = porTexto ?? porClase;
  if (declared !== undefined) return declared;
  if (atom.headingLevel !== null) return atom.headingLevel === 1 ? "titulo1" : "titulo2";
  if (atom.align === "end" && atom.text.length <= MAX_BYLINE) return "firma";
  return "parrafo";
}

/** Texto de un borrador ("" para espacios). */
export function textoDe(draft: Draft): string {
  switch (draft.type) {
    case "heading":
    case "paragraph":
    case "byline":
    case "ornament":
      return draft.text;
    case "spacer":
      return "";
  }
}
