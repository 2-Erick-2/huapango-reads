import { A } from "@solidjs/router";
import { For, Match, Switch, createSignal, onMount } from "solid-js";
import {
  formatAuthors,
  formatDigitalPrice,
  upcomingStatusLabel,
  type CatalogRow,
} from "~/lib/catalog";
import { BookCover } from "./BookCover";
import { UpcomingCover } from "./UpcomingCover";

/**
 * Fila tipo Netflix: desplazamiento horizontal nativo (swipe en táctil, rueda/trackpad en
 * escritorio) más flechas accesibles. Sin librerías de carrusel.
 */
export function BookRow(props: { row: CatalogRow }) {
  let scroller!: HTMLDivElement;
  const [canPrev, setCanPrev] = createSignal(false);
  const [canNext, setCanNext] = createSignal(false);

  const update = () => {
    setCanPrev(scroller.scrollLeft > 4);
    setCanNext(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4);
  };
  const page = (dir: 1 | -1) =>
    scroller.scrollBy({ left: dir * scroller.clientWidth * 0.85, behavior: "smooth" });

  onMount(update);

  const headingId = () => `fila-${props.row.id}`;

  return (
    <section aria-labelledby={headingId()} id={props.row.id} class="group/row flex flex-col gap-5">
      <div class="flex items-baseline justify-between gap-4 px-4 sm:px-10">
        <h2
          id={headingId()}
          class="font-serif text-[22px] font-normal tracking-tight sm:text-[28px]"
        >
          {props.row.title}
        </h2>
        <div class="flex items-center gap-4">
          <span class="hidden text-xs font-semibold uppercase tracking-[0.2em] text-carbon-400 sm:inline">
            {props.row.meta}
          </span>
          <div class="hidden gap-2 md:flex">
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-sm border border-carbon-700 text-bond-300 transition-colors hover:border-carbon-400 disabled:opacity-30"
              aria-label={`Anteriores en ${props.row.title}`}
              disabled={!canPrev()}
              onClick={() => page(-1)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-sm border border-carbon-700 text-bond-300 transition-colors hover:border-carbon-400 disabled:opacity-30"
              aria-label={`Siguientes en ${props.row.title}`}
              disabled={!canNext()}
              onClick={() => page(1)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        onScroll={update}
        class="row-scroll flex gap-4 overflow-x-auto px-4 pb-3 pt-2 sm:gap-6 sm:px-10"
      >
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
                      <span class="font-serif text-[15px] font-semibold leading-tight text-bond-100 sm:text-[17px]">
                        {book().title}
                      </span>
                      <span class="text-xs text-carbon-300 sm:text-[13px]">
                        {formatAuthors(book().authors)}
                      </span>
                      <span class="hidden text-xs text-carbon-400 sm:inline">
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
                      <span class="font-serif text-[15px] font-semibold leading-tight text-bond-100 sm:text-[17px]">
                        {book().title}
                      </span>
                      <span class="text-xs text-carbon-300 sm:text-[13px]">{book().credit}</span>
                      <span class="hidden text-xs text-carbon-400 sm:inline">
                        {book().genre} · {upcomingStatusLabel(book().status)}
                      </span>
                    </span>
                  </div>
                )}
              </Match>
            </Switch>
          )}
        </For>
      </div>
    </section>
  );
}
