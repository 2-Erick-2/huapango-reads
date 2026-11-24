/**
 * Paquete de obra (ADR 0019): una obra escrita en el panel, en un solo archivo JSON. Es la forma en que
 * una obra nueva (un libro o un ensayo) pasa del panel a `contenido-privado/<obra>/paquete.json` y de
 * ahí, con `npm run contenido:publicar`, a la app. Lógica pura: la usan el panel (navegador) y el
 * publicador (Node).
 */
import { computeStats, hashText } from "./text.ts";
import type { Block, Manifest, Pieza, PiezaKind } from "./types.ts";
import { validatePieza } from "./validate.ts";

export type TipoObra = "libro" | "ensayo";

export interface PaqueteObra {
  version: 1;
  /** Slug de la obra; también el de su pieza principal */
  obra: string;
  tipo: TipoObra;
  titulo: string;
  autores: string[];
  /** Sinopsis (libro) o resumen (ensayo). Puede ir vacío mientras se escribe. */
  sinopsis: string;
  /** La principal primero; después los complementos (solo en libros), en orden de lectura */
  piezas: Pieza[];
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "El poder de la sombra" → "el-poder-de-la-sombra". Sin acentos, ñ → n, máximo 60 caracteres. */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export interface NuevaPiezaInput {
  slug: string;
  title: string;
  kind: PiezaKind;
  parentSlug: string | null;
  credit: string | null;
}

/** Pieza recién creada: su título y un párrafo vacío listo para escribir. */
export function nuevaPieza(input: NuevaPiezaInput): Pieza {
  const blocks: Block[] = [
    {
      id: `${input.slug}-1`,
      page: null,
      type: "heading",
      level: 1,
      text: [input.title],
    },
    {
      id: `${input.slug}-2`,
      page: null,
      type: "paragraph",
      text: [],
      indent: false,
      align: "justify",
      dropCap: false,
      hash: hashText(""),
      marks: [],
    },
  ];
  return {
    version: 1,
    slug: input.slug,
    kind: input.kind,
    parentSlug: input.parentSlug,
    title: input.title,
    credit: input.credit,
    language: "es-MX",
    blocks,
    stats: computeStats(blocks),
    source: { file: "panel", sha256: "" },
  };
}

/** Obra nueva con su pieza principal. */
export function nuevaObra(input: {
  tipo: TipoObra;
  titulo: string;
  autores: string[];
  sinopsis: string;
  obra?: string;
}): PaqueteObra {
  const titulo = input.titulo.trim();
  const obra = input.obra?.trim() || slugify(titulo);
  const autores = input.autores.map((a) => a.trim()).filter((a) => a !== "");
  return {
    version: 1,
    obra,
    tipo: input.tipo,
    titulo,
    autores,
    sinopsis: input.sinopsis.trim(),
    piezas: [
      nuevaPieza({
        slug: obra,
        title: titulo,
        kind: input.tipo,
        parentSlug: null,
        credit: autores.length > 0 ? autores.join(" y ") : null,
      }),
    ],
  };
}

/** Errores que impiden publicar el paquete (lista vacía = listo). Los avisos de estilo no cuentan. */
export function validarPaquete(p: PaqueteObra): string[] {
  const errores: string[] = [];
  if (p.version !== 1) errores.push(`Versión de paquete no soportada: ${String(p.version)}`);
  if (!SLUG.test(p.obra)) errores.push(`El identificador de la obra no es válido: "${p.obra}"`);
  if (p.tipo !== "libro" && p.tipo !== "ensayo")
    errores.push(`Tipo de obra desconocido: ${String(p.tipo)}`);
  if (p.titulo.trim() === "") errores.push("La obra no tiene título");
  if (p.autores.length === 0 || p.autores.some((a) => a.trim() === ""))
    errores.push("La obra necesita al menos un autor, sin nombres vacíos");
  if (p.piezas.length === 0) errores.push("La obra no tiene piezas");

  const principal = p.piezas[0];
  if (principal) {
    if (principal.slug !== p.obra) errores.push("La primera pieza debe tener el slug de la obra");
    if (principal.kind !== p.tipo)
      errores.push(`La primera pieza debe ser de tipo "${p.tipo}" y es "${principal.kind}"`);
  }
  if (p.tipo === "ensayo" && p.piezas.length > 1)
    errores.push("Un ensayo es de una sola pieza: quita las demás");

  const vistos = new Set<string>();
  p.piezas.forEach((pieza, i) => {
    if (vistos.has(pieza.slug)) errores.push(`Pieza repetida: ${pieza.slug}`);
    vistos.add(pieza.slug);
    if (i > 0 && (pieza.kind !== "complemento" || pieza.parentSlug !== p.obra))
      errores.push(`${pieza.slug}: un complemento debe colgar de la obra "${p.obra}"`);
    // Un paquete no lleva imágenes todavía (el editor aún no las sube): se validan sin archivos.
    for (const issue of validatePieza(pieza, new Set<string>())) {
      if (issue.level === "error") errores.push(`${pieza.title}: ${issue.message}`);
    }
  });
  return errores;
}

export function manifestDePaquete(p: PaqueteObra): Manifest {
  return {
    version: 1,
    obra: p.obra,
    ...(p.sinopsis !== "" ? { summary: p.sinopsis } : {}),
    authors: p.autores,
    pieces: p.piezas.map((pieza) => ({
      slug: pieza.slug,
      kind: pieza.kind,
      title: pieza.title,
      credit: pieza.credit,
      file: `${pieza.slug}.json`,
      stats: pieza.stats,
    })),
  };
}
