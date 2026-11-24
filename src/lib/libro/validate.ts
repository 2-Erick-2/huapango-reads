/**
 * Validación de una pieza en formato canónico. Se usa en el importador (para no publicar nada roto),
 * en las pruebas y, más adelante, en el editor y el panel de la editorial.
 */
import { blockText, computeStats, hashText, looksTruncated } from "./text.ts";
import type { Block, Pieza } from "./types.ts";

export interface Issue {
  level: "error" | "warning";
  /** Id del bloque afectado, o null si es de la pieza completa */
  id: string | null;
  code: string;
  message: string;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Caracteres de control (Cc) e invisibles de formato (Cf: guion suave, espacios de ancho cero...).
// Tras la limpieza del importador no debe quedar ninguno, ni siquiera saltos de linea.
const CONTROL_OR_INVISIBLE = /[\p{Cc}\p{Cf}]/u;

export function validatePieza(pieza: Pieza, assets?: ReadonlySet<string>): Issue[] {
  const issues: Issue[] = [];
  const add = (level: Issue["level"], id: string | null, code: string, message: string) =>
    issues.push({ level, id, code, message });

  if (pieza.version !== 1) add("error", null, "version", `Versión no soportada: ${pieza.version}`);
  if (!SLUG.test(pieza.slug)) add("error", null, "slug", `Slug inválido: "${pieza.slug}"`);
  if (pieza.title.trim() === "") add("error", null, "titulo", "La pieza no tiene título");
  if (pieza.kind === "complemento" && pieza.parentSlug === null)
    add("error", null, "padre", "Un complemento necesita parentSlug");
  if ((pieza.kind === "libro" || pieza.kind === "ensayo") && pieza.parentSlug !== null)
    add("error", null, "padre", "Un libro o un ensayo no puede tener parentSlug");
  if (pieza.blocks.length === 0) add("error", null, "vacia", "La pieza no tiene bloques");

  const seen = new Set<string>();
  pieza.blocks.forEach((block, index) => {
    validateBlock(block, index, pieza, seen, assets, add);
  });

  const stats = computeStats(pieza.blocks);
  if (
    stats.words !== pieza.stats.words ||
    stats.paragraphs !== pieza.stats.paragraphs ||
    stats.minutes !== pieza.stats.minutes
  ) {
    add("error", null, "stats", "Las estadísticas no coinciden con el contenido");
  }
  return issues;
}

function validateBlock(
  block: Block,
  index: number,
  pieza: Pieza,
  seen: Set<string>,
  assets: ReadonlySet<string> | undefined,
  add: (level: Issue["level"], id: string | null, code: string, message: string) => void,
): void {
  if (!block.id.startsWith(`${pieza.slug}-`))
    add("error", block.id, "id", "El id no lleva el slug de la pieza");
  if (seen.has(block.id)) add("error", block.id, "id-repetido", "Id repetido");
  seen.add(block.id);

  const text = blockText(block);
  if (text !== "" && CONTROL_OR_INVISIBLE.test(text))
    add("error", block.id, "invisibles", "Contiene caracteres de control o invisibles");

  switch (block.type) {
    case "paragraph": {
      validateText(block.id, text, add);
      if (text.trim() === "") add("error", block.id, "vacio", "Párrafo vacío");
      if (looksTruncated(text))
        add(
          "warning",
          block.id,
          "posible-corte",
          `Termina sin puntuación final: "…${text.slice(-40)}"`,
        );
      if (block.hash !== hashText(text))
        add("error", block.id, "hash", "La huella no coincide con el texto");
      let last = -1;
      for (const mark of block.marks) {
        if (mark.offset < 0 || mark.offset > text.length || mark.offset < last)
          add("error", block.id, "marca-pagina", "Marca de página fuera de rango o desordenada");
        last = mark.offset;
      }
      break;
    }
    case "heading":
      validateText(block.id, text, add);
      if (text.trim() === "") add("error", block.id, "vacio", "Título vacío");
      break;
    case "byline":
      validateText(block.id, text, add);
      if (text.trim() === "") add("error", block.id, "vacio", "Firma vacía");
      if (text.length > 80)
        add(
          "error",
          block.id,
          "firma-larga",
          "Una firma de más de 80 caracteres parece un párrafo",
        );
      if (block.hash !== hashText(text))
        add("error", block.id, "hash", "La huella no coincide con el texto");
      break;
    case "ornament":
      if (block.text.trim() === "") add("error", block.id, "vacio", "Ornamento vacío");
      break;
    case "image":
      if (block.asset === "") add("error", block.id, "asset", "Imagen sin archivo");
      else if (assets && !assets.has(block.asset))
        add("error", block.id, "asset-faltante", `No existe ${block.asset}`);
      if (!block.decorative && block.alt.trim() === "")
        add("error", block.id, "alt", "Una imagen informativa necesita texto alternativo");
      if (block.decorative && block.alt !== "")
        add("warning", block.id, "alt-decorativa", "Una imagen decorativa debe llevar alt vacío");
      if (block.width <= 0 || block.height <= 0)
        add("error", block.id, "medidas", "Imagen sin medidas");
      if (
        block.crop &&
        !(block.crop.from >= 0 && block.crop.to <= 1 && block.crop.from < block.crop.to)
      )
        add("error", block.id, "recorte", "El recorte debe cumplir 0 <= from < to <= 1");
      break;
    case "spacer": {
      const prev = pieza.blocks[index - 1];
      const next = pieza.blocks[index + 1];
      if (prev === undefined || next === undefined)
        add("error", block.id, "espacio-borde", "Un espacio no puede ir al inicio ni al final");
      else if (prev.type === "spacer")
        add("error", block.id, "espacio-doble", "Dos espacios seguidos");
      break;
    }
  }
}

function validateText(
  id: string,
  text: string,
  add: (level: Issue["level"], id: string | null, code: string, message: string) => void,
): void {
  if (text !== text.trim()) add("error", id, "espacios-borde", "Espacios al inicio o al final");
  if (/ {2,}/.test(text)) add("error", id, "espacios-dobles", "Espacios dobles dentro del texto");
}
