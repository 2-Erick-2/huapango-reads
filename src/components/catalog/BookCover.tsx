import { Show } from "solid-js";
import type { Book } from "~/lib/catalog";

/**
 * Portada con lomo y sombra de libro. Usa WebP con srcset (260/500 px) y JPG de respaldo,
 * o una composición tipográfica de papel cuando la obra aún no tiene portada ilustrada.
 */
export function BookCover(props: {
  book: Book;
  sizes: string;
  priority?: boolean;
  class?: string;
  shadow?: "book" | "hero";
}) {
  return (
    <div
      class={`book-spine aspect-[25/36] overflow-hidden rounded-sm bg-papel ${
        props.shadow === "hero" ? "shadow-book-hero" : "shadow-book"
      } ${props.class ?? ""}`}
    >
      <Show
        when={props.book.cover.jpg}
        fallback={
          <div class="flex h-full w-full flex-col justify-between p-4 text-papel-tinta sm:p-5">
            <div class="flex items-center justify-between gap-2 border-b border-linea pb-2">
              <span class="font-serif text-[11px] italic text-papel-acento">+reads</span>
              <span class="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-papel-tinta/60">
                Huapango
              </span>
            </div>
            <div class="my-auto flex flex-col gap-2 py-2">
              <p class="m-0 line-clamp-4 font-serif text-lg font-light leading-tight text-papel-tinta sm:text-2xl">
                {props.book.title}
              </p>
              <Show when={props.book.subtitle}>
                <p class="m-0 line-clamp-2 font-serif text-xs italic text-papel-tinta/75 sm:text-sm">
                  {props.book.subtitle}
                </p>
              </Show>
            </div>
            <p class="m-0 truncate border-t border-linea pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-papel-tinta/70">
              {props.book.authors.join(" & ")}
            </p>
          </div>
        }
      >
        <picture>
          <source
            type="image/webp"
            srcset={`${props.book.cover.webpSmall} 260w, ${props.book.cover.webp} 500w`}
            sizes={props.sizes}
          />
          <img
            src={props.book.cover.jpg}
            alt={`Portada de ${props.book.title}`}
            width="500"
            height="720"
            loading={props.priority ? "eager" : "lazy"}
            fetchpriority={props.priority ? "high" : "auto"}
            decoding="async"
            class="block h-full w-full object-cover"
          />
        </picture>
      </Show>
    </div>
  );
}
