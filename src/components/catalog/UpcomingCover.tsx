import { collectionName, type UpcomingBook } from "~/lib/catalog";

/**
 * Portada tipográfica para títulos sin portada oficial todavía (etiquetada "Próximamente").
 * En el celular la tarjeta mide 128 px: la letra se ajusta y los títulos largos se parten dentro de
 * la tarjeta, nunca se salen.
 */
export function UpcomingCover(props: { book: UpcomingBook; class?: string }) {
  return (
    <div
      class={`flex aspect-[25/36] flex-col justify-between gap-2 overflow-hidden rounded-sm border border-linea-fuerte bg-superficie-2 px-3 py-3.5 sm:px-4 sm:py-[18px] ${props.class ?? ""}`}
      role="img"
      aria-label={`${props.book.title}, próximamente en ${collectionName(props.book.collection)}`}
    >
      <span class="text-[9px] font-bold uppercase leading-snug tracking-[0.16em] text-acento sm:text-[10px] sm:tracking-[0.22em]">
        {collectionName(props.book.collection)}
      </span>
      <span class="hyphens-auto font-serif text-[16px] leading-[1.15] text-tinta [overflow-wrap:anywhere] sm:text-[22px]">
        {props.book.title}
      </span>
      <span class="max-w-full self-start whitespace-nowrap rounded-full border border-acento-tenue-borde bg-acento-tenue px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.06em] sm:px-2 text-acento sm:py-1 sm:text-[10px] sm:tracking-[0.16em]">
        Próximamente
      </span>
    </div>
  );
}
