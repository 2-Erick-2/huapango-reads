import { A } from "@solidjs/router";
import { For, Match, Switch } from "solid-js";
import {
  formatAuthors,
  formatDigitalPrice,
  upcomingStatusLabel,
  type CatalogRow,
} from "~/lib/catalog";
import { BookCover } from "./BookCover";
import { Carousel } from "./Carousel";
import { UpcomingCover } from "./UpcomingCover";

/** Fila del catálogo: portadas de libros publicados y próximos, dentro del carrusel común. */
export function BookRow(props: { row: CatalogRow }) {
  return (
    <Carousel id={props.row.id} title={props.row.title} meta={props.row.meta}>
      <For each={props.row.items}>
        {(item) => (
          <Switch>
            <Match when={item.kind === "book" && item.book}>
              {(book) => (
                <A
                  href={`/libro/${book().slug}`}
                  class="group flex w-32 shrink-0 snap-start flex-col gap-3 no-underline sm:w-[200px]"
                >
                  <BookCover
                    book={book()}
                    sizes="(min-width: 640px) 200px, 128px"
                    class="transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1.5 group-hover:shadow-book-hover"
                  />
                  <span class="flex flex-col gap-1">
                    <span class="font-serif text-[15px] font-semibold leading-tight text-tinta sm:text-[17px]">
                      {book().title}
                    </span>
                    <span class="text-xs text-tinta-suave sm:text-[13px]">
                      {formatAuthors(book().authors)}
                    </span>
                    <span class="hidden text-xs text-tinta-tenue sm:inline">
                      {formatDigitalPrice(book())}
                    </span>
                  </span>
                </A>
              )}
            </Match>
            <Match when={item.kind === "upcoming" && item.book}>
              {(book) => (
                <div class="flex w-32 shrink-0 snap-start flex-col gap-3 sm:w-[200px]">
                  <UpcomingCover book={book()} />
                  <span class="flex flex-col gap-1">
                    <span class="font-serif text-[15px] font-semibold leading-tight text-tinta sm:text-[17px]">
                      {book().title}
                    </span>
                    <span class="text-xs text-tinta-suave sm:text-[13px]">{book().credit}</span>
                    <span class="hidden text-xs text-tinta-tenue sm:inline">
                      {book().genre} · {upcomingStatusLabel(book().status)}
                    </span>
                  </span>
                </div>
              )}
            </Match>
          </Switch>
        )}
      </For>
    </Carousel>
  );
}
