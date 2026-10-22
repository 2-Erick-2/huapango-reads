import type { Book } from "~/lib/catalog";

/**
 * Portada con lomo y sombra de libro. Usa WebP con srcset (260/500 px) y JPG de respaldo.
 * `sizes` debe describir el ancho real en pantalla para que el navegador elija bien.
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
      class={`book-spine aspect-[25/36] overflow-hidden rounded-sm ${
        props.shadow === "hero" ? "shadow-book-hero" : "shadow-book"
      } ${props.class ?? ""}`}
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
    </div>
  );
}
