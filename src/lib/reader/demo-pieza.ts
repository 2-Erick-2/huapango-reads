/**
 * El texto de demostración (capítulos y párrafos) convertido al formato canónico, para que el lector
 * tenga un solo motor. Se usa en /leer/demo y para los libros que aún no tienen contenido importado.
 */
import { computeStats, hashText } from "~/lib/libro/text";
import type { Block, Pieza } from "~/lib/libro/types";
import { DEMO_TEXT } from "./demo-text";

export function demoPieza(): Pieza {
  const blocks: Block[] = [];
  let n = 0;
  const id = () => `demo-${++n}`;

  for (const chapter of DEMO_TEXT.chapters) {
    blocks.push({ id: id(), page: null, type: "heading", level: 3, text: [chapter.label] });
    blocks.push({ id: id(), page: null, type: "heading", level: 2, text: [chapter.title] });
    chapter.paragraphs.forEach((text, i) => {
      blocks.push({
        id: id(),
        page: null,
        type: "paragraph",
        text: [text],
        indent: i > 0,
        align: "justify",
        dropCap: false,
        hash: hashText(text),
        marks: [],
      });
    });
  }

  return {
    version: 1,
    slug: "demo",
    kind: "libro",
    parentSlug: null,
    title: DEMO_TEXT.title,
    credit: null,
    language: "es-MX",
    blocks,
    stats: computeStats(blocks),
    source: { file: "demo-text.ts", sha256: "" },
  };
}

export const DEMO_NOTICE = DEMO_TEXT.notice;
