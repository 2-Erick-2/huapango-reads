import { collectionName, type UpcomingBook } from "~/lib/catalog";

/** Portada tipográfica para títulos sin portada oficial todavía (etiquetada "Próximamente") */
export function UpcomingCover(props: { book: UpcomingBook; class?: string }) {
  return (
    <div
      class={`flex aspect-[25/36] flex-col justify-between rounded-sm border border-carbon-700 bg-carbon-800 px-4 py-[18px] ${props.class ?? ""}`}
      role="img"
      aria-label={`${props.book.title}, próximamente en ${collectionName(props.book.collection)}`}
    >
      <span class="text-[10px] font-bold uppercase tracking-[0.22em] text-terregal-400">
        {collectionName(props.book.collection)}
      </span>
      <span class="font-serif text-[22px] leading-[1.15] text-bond-100">{props.book.title}</span>
      <span class="self-start rounded-full border border-terregal-800 bg-terregal-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-terregal-400">
        Próximamente
      </span>
    </div>
  );
}
