/**
 * Corte del flujo en piezas (prólogo, cuento, epílogo…) y construcción de cada `Pieza` canónica.
 *
 * El corte es por anclas de texto declaradas en el mapeo, no por posiciones, y es exhaustivo: todo
 * texto del origen debe caer en una pieza o fallar con un mensaje que diga cuál quedó afuera.
 */
import {
  blockText,
  cleanText,
  computeStats,
  hashText,
  plainText,
} from "../../src/lib/libro/text.ts";
import type { Block, ImageBlock, Pieza } from "../../src/lib/libro/types.ts";
import type { ImgAtom } from "./atoms.ts";
import type { Colocacion, FuenteMapeo, PiezaMapeo } from "./mapeo.ts";
import { textoDe, type Draft } from "./normalizar.ts";

export interface ImagenPreparada {
  assetName: string;
  width: number;
  height: number;
}

export interface PiezaDraft {
  def: PiezaMapeo;
  drafts: Draft[];
}

export interface Construccion {
  pieza: Pieza;
  /** Bloques que no vienen del texto del origen (el título que sale de una portadilla en imagen) */
  injected: Set<string>;
  imagenesUsadas: Set<string>;
}

const short = (text: string) => (text.length > 60 ? `${text.slice(0, 60)}…` : text);

export function dividir(drafts: readonly Draft[], fuente: FuenteMapeo): PiezaDraft[] {
  const out: PiezaDraft[] = [];
  let cursor = 0;

  for (const def of fuente.piezas) {
    const desde = cleanText(def.desde);
    const hasta = cleanText(def.hasta);

    const starts = indicesDe(drafts, desde);
    if (starts.length === 0)
      throw new Error(
        `Pieza "${def.slug}": no hay ningún bloque que empiece con "${short(def.desde)}"`,
      );
    if (starts.length > 1)
      throw new Error(
        `Pieza "${def.slug}": "${short(def.desde)}" es ambiguo, empieza ${starts.length} bloques. Alarga el texto de "desde".`,
      );
    const start = starts[0] ?? 0;
    if (start < cursor)
      throw new Error(
        `Pieza "${def.slug}" empieza antes de donde terminó la anterior: revisa el orden de "piezas".`,
      );

    assertSoloEspacios(drafts, cursor, start, `entre la pieza anterior y "${def.slug}"`);

    const end = indicesDe(drafts, hasta).find((i) => i >= start);
    if (end === undefined)
      throw new Error(
        `Pieza "${def.slug}": no se encontró el final "${short(def.hasta)}" después del inicio.`,
      );

    out.push({ def, drafts: drafts.slice(start, end + 1) });
    cursor = end + 1;
  }
  assertSoloEspacios(drafts, cursor, drafts.length, "después de la última pieza");
  return out;
}

function indicesDe(drafts: readonly Draft[], prefix: string): number[] {
  const found: number[] = [];
  drafts.forEach((d, i) => {
    if (d.type !== "spacer" && textoDe(d).startsWith(prefix)) found.push(i);
  });
  return found;
}

function assertSoloEspacios(
  drafts: readonly Draft[],
  from: number,
  to: number,
  where: string,
): void {
  const stray = drafts.slice(from, to).filter((d) => d.type !== "spacer");
  if (stray.length > 0) {
    const first = stray
      .slice(0, 3)
      .map((d) => `"${short(textoDe(d))}"`)
      .join(", ");
    throw new Error(
      `Hay ${stray.length} bloque(s) de texto sin pieza ${where}: ${first}. Ajusta "desde"/"hasta" o márcalos como "ignorar".`,
    );
  }
}

export function construirPieza(
  def: PiezaMapeo,
  drafts: readonly Draft[],
  fuente: FuenteMapeo,
  imagenes: ReadonlyMap<string, ImgAtom>,
  preparadas: ReadonlyMap<string, ImagenPreparada>,
  origen: { file: string; sha256: string },
  parentSlug: string | null,
): Construccion {
  type Pending = { block: Block; injected: boolean };
  const items: Pending[] = [];
  const push = (block: Block, injected = false) => items.push({ block, injected });
  const blank = { id: "", page: null };

  if (def.portadilla !== undefined) {
    const texto = fuente.imagenes[def.portadilla]?.texto ?? def.titulo;
    push({ ...blank, type: "heading", level: 1, text: [texto] }, true);
  }

  // Sin espacios al inicio ni al final, y nunca dos seguidos.
  for (const d of drafts) {
    const prev = items[items.length - 1]?.block;
    switch (d.type) {
      case "spacer":
        if (prev !== undefined && prev.type !== "spacer") push({ ...blank, type: "spacer" });
        break;
      case "heading":
        push({ ...blank, page: d.page, type: "heading", level: d.level, text: d.inlines });
        break;
      case "paragraph":
        push({
          ...blank,
          page: d.page,
          type: "paragraph",
          text: d.inlines,
          indent: d.indent,
          align: d.align,
          dropCap: false,
          hash: hashText(d.text),
          marks: d.marks,
        });
        break;
      case "byline":
        push({
          ...blank,
          page: d.page,
          type: "byline",
          text: d.inlines,
          credit: d.credit,
          hash: hashText(d.text),
        });
        break;
      case "ornament":
        push({ ...blank, page: d.page, type: "ornament", text: d.text });
        break;
    }
  }
  // Por seguridad: tampoco puede quedar un espacio al final.
  while (items[items.length - 1]?.block.type === "spacer") items.pop();

  if (def.capitular === true) {
    const first = items.find((p) => p.block.type === "paragraph")?.block;
    if (first?.type === "paragraph" && /^\p{L}/u.test(plainText(first.text))) first.dropCap = true;
  }

  const imagenesUsadas = new Set<string>();
  /** Bloques que genera colocar una imagen: normalmente uno; una tarjeta de capítulo da adorno + título. */
  const makeImage = (c: Colocacion): Pending[] => {
    const meta = fuente.imagenes[c.imagen];
    const atom = imagenes.get(c.imagen);
    const prepared = preparadas.get(c.imagen);
    if (!meta || !atom || !prepared)
      throw new Error(`Pieza "${def.slug}": la imagen "${c.imagen}" no está en el origen`);
    if (meta.rol === "titulo" || meta.rol === "ignorar")
      throw new Error(`Pieza "${def.slug}": "${c.imagen}" tiene rol "${meta.rol}" y no se coloca`);
    imagenesUsadas.add(c.imagen);

    if (meta.rol === "capitulo") {
      // La tarjeta trae el nombre del capítulo dentro de la imagen: se conserva solo el adorno
      // (recortado) y el nombre pasa a ser un título real, accesible y visible en el índice.
      const recorte = meta.recorte ?? { desde: 0.04, hasta: 0.44 };
      const adorno: ImageBlock = {
        ...blank,
        type: "image",
        asset: prepared.assetName,
        alt: "",
        role: "ornamento",
        decorative: true,
        widthPct: atom.widthPct,
        width: prepared.width,
        height: prepared.height,
        crop: { from: recorte.desde, to: recorte.hasta },
      };
      const titulo: Block = { ...blank, type: "heading", level: 2, text: [meta.texto ?? ""] };
      return [
        { block: adorno, injected: true },
        { block: titulo, injected: true },
      ];
    }

    const alt = meta.alt ?? "";
    const block: ImageBlock = {
      ...blank,
      type: "image",
      asset: prepared.assetName,
      alt,
      role: meta.rol,
      decorative: alt === "",
      widthPct: atom.widthPct,
      width: prepared.width,
      height: prepared.height,
    };
    return [{ block, injected: true }];
  };

  const anchorIndex = (prefix: string): number => {
    const p = cleanText(prefix);
    const found = items.flatMap((it, i) =>
      it.block.type !== "spacer" && blockText(it.block).startsWith(p) ? [i] : [],
    );
    if (found.length !== 1)
      throw new Error(
        `Pieza "${def.slug}": el ancla "${short(prefix)}" coincide con ${found.length} bloques (debe ser 1).`,
      );
    return found[0] ?? 0;
  };

  const placements = def.colocar ?? [];
  // "después de" se aplica en orden inverso para que varias imágenes en la misma ancla conserven su orden.
  const ordered = [
    ...placements.filter((c) => c.despues === undefined),
    ...placements.filter((c) => c.despues !== undefined).reverse(),
  ];
  for (const c of ordered) {
    const nuevos = makeImage(c);
    if (c.alInicio) items.unshift(...nuevos);
    else if (c.alFinal) items.push(...nuevos);
    else if (c.antes !== undefined) items.splice(anchorIndex(c.antes), 0, ...nuevos);
    else if (c.despues !== undefined) items.splice(anchorIndex(c.despues) + 1, 0, ...nuevos);
  }

  const injected = new Set<string>();
  const blocks = items.map((it, i) => {
    const id = `${def.slug}-${i + 1}`;
    if (it.injected) injected.add(id);
    return { ...it.block, id };
  });

  const last = blocks[blocks.length - 1];
  const credit = last?.type === "byline" ? blockText(last) : null;

  const pieza: Pieza = {
    version: 1,
    slug: def.slug,
    kind: def.tipo,
    parentSlug: def.tipo === "complemento" ? parentSlug : null,
    title: def.titulo,
    credit,
    language: "es-MX",
    blocks,
    stats: computeStats(blocks),
    source: origen,
  };
  return { pieza, injected, imagenesUsadas };
}
