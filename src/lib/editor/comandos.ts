/** Comandos de teclado del editor que dependen del formato canónico. */
import {
  chainCommands,
  createParagraphNear,
  liftEmptyBlock,
  newlineInCode,
  splitBlockAs,
} from "prosemirror-commands";
import type { Command } from "prosemirror-state";
import { nodeType } from "./schema";

/**
 * Enter: el bloque que sigue siempre es un párrafo, con la alineación del anterior (nunca su capitular
 * ni sus datos del impreso). Sangría como en el libro: sin sangría tras un título, con sangría después.
 * Partir un título o una firma a la mitad conserva su tipo.
 */
export const enter: Command = chainCommands(
  newlineInCode,
  createParagraphNear,
  liftEmptyBlock,
  splitBlockAs((node, atEnd) => {
    const paragraph = nodeType("paragraph");
    if (node.type === paragraph) {
      // Prosa (justificada o a la izquierda): como en el libro, solo el primer párrafo tras un título
      // va sin sangría; los que siguen la llevan. Versos centrados o a la derecha conservan su formato.
      const align = String(node.attrs["align"]);
      const prosa = align === "justify" || align === "start";
      return {
        type: paragraph,
        attrs: { indent: prosa ? true : node.attrs["indent"], align, dropCap: false },
      };
    }
    if (!atEnd) return null;
    return {
      type: paragraph,
      attrs: { indent: node.type.name !== "heading", align: "justify", dropCap: false },
    };
  }),
);
