import { A, createAsync, query } from "@solidjs/router";
import { For, Show, createSignal, onMount } from "solid-js";
import { essays, inProgress, type ShelfItem } from "~/lib/contenido/shelves";
import { piezaTag, readHref } from "~/lib/contenido";
import { ensayosPublicados } from "~/lib/contenido/ensayos";
import { loadPosition } from "~/lib/reader/position";
import { BookCover } from "./BookCover";
import { Carousel } from "./Carousel";

function href(item: ShelfItem): string {
  return readHref(item.obra, item.kind === "complemento" ? item.slug : undefined);
}

/** Portada de una pieza: la del libro si es el libro; si no, un minilibro de papel con su listón. */
function ShelfCover(props: { item: ShelfItem }) {
  return (
    <Show
      when={props.item.kind === "libro" && props.item.book}
      fallback={
        <div class="book-spine relative aspect-[25/36] overflow-hidden rounded-sm bg-papel shadow-book transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1.5 group-hover:shadow-book-hover">
          <span class="absolute right-[7%] top-[5%] font-serif text-[13px] italic text-papel-acento">
            +reads
          </span>
          <span class="absolute inset-x-0 top-[38%] flex h-[11%] items-center justify-center bg-liston text-[12px] font-semibold tracking-wide text-liston-tinta">
            {props.item.kind === "ensayo" ? "ensayo" : piezaTag(props.item.title)}
          </span>
          <span class="absolute inset-x-3 top-[55%] text-center font-serif text-[12px] italic leading-tight text-papel-tinta">
            {props.item.credit ?? props.item.bookTitle}
          </span>
        </div>
      }
    >
      {(book) => (
        <BookCover
          book={book()}
          sizes="(min-width: 640px) 200px, 128px"
          class="transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1.5 group-hover:shadow-book-hover"
        />
      )}
    </Show>
  );
}

function ShelfCard(props: { item: ShelfItem; progress?: boolean; free?: boolean }) {
  return (
    <A
      href={href(props.item)}
      class="group flex w-32 shrink-0 snap-start flex-col gap-3 no-underline sm:w-[200px]"
    >
      <div class="relative">
        <ShelfCover item={props.item} />
        <span class="absolute left-2 top-2 rounded-full bg-liston/90 px-2.5 py-1 text-[11px] font-semibold text-liston-tinta">
          {props.item.minutes} min
        </span>
      </div>
      <span class="flex flex-col gap-1">
        <span class="font-serif text-[15px] font-semibold leading-tight text-tinta sm:text-[17px]">
          {props.item.title}
        </span>
        <span class="text-xs text-tinta-suave sm:text-[13px]">
          {props.item.kind === "libro"
            ? (props.item.book?.authors.join(" & ") ?? "")
            : props.item.kind === "ensayo"
              ? (props.item.credit ?? "")
              : props.item.bookTitle}
        </span>
        <Show when={props.free}>
          <span class="hidden text-xs font-semibold text-acento sm:inline">Lectura gratuita</span>
        </Show>
        <Show when={props.progress && props.item.progress !== null}>
          <span class="mt-1 flex flex-col gap-1.5">
            <span class="h-[3px] overflow-hidden rounded-sm bg-control">
              <span
                class="block h-full bg-acento-vivo"
                style={{ width: `${Math.round((props.item.progress ?? 0) * 100)}%` }}
              />
            </span>
            <span class="text-xs text-tinta-suave">
              {Math.round((props.item.progress ?? 0) * 100)} % leído
            </span>
          </span>
        </Show>
      </span>
    </A>
  );
}

/** "Continúa leyendo": se arma en el navegador con el avance guardado; sin avance, no se muestra. */
export function ContinueShelf() {
  const [items, setItems] = createSignal<ShelfItem[]>([]);
  onMount(() => setItems(inProgress(loadPosition)));
  return (
    <Show when={items().length > 0}>
      <Carousel id="continua" title="Continúa leyendo">
        <For each={items()}>{(item) => <ShelfCard item={item} progress />}</For>
      </Carousel>
    </Show>
  );
}

/**
 * "Ensayos": lecturas de acceso libre. Se publican desde el panel de la editorial. Mientras no haya
 * ninguno, la fila lo dice en lugar de inventar contenido (nunca se rellena con tarjetas falsas:
 * los dueños y los lectores las tomarían por ensayos reales).
 */
const cargarEnsayos = query(async (): Promise<ShelfItem[]> => {
  const publicados = await ensayosPublicados();
  const desdePanel: ShelfItem[] = publicados.map((e) => ({
    obra: e.obra,
    slug: e.slug,
    title: e.title,
    bookTitle: e.title,
    book: undefined,
    credit: e.credit,
    summary: e.summary,
    minutes: e.minutes,
    kind: "ensayo",
    progress: null,
  }));
  const estaticos = essays().filter((x) => !desdePanel.some((y) => y.obra === x.obra));
  return [...desdePanel, ...estaticos];
}, "ensayos");

export function EssayShelf() {
  const cargados = createAsync(() => cargarEnsayos());
  const items = () => cargados() ?? essays();
  return (
    <Carousel
      id="ensayos"
      title="Ensayos"
      meta="Gratis"
      subtitle="Lecturas de acceso libre de Editorial Huapango."
    >
      <Show
        when={items().length > 0}
        fallback={
          <p class="m-0 flex min-h-[132px] w-full max-w-[560px] items-center rounded-sm border border-dashed border-borde px-6 py-5 text-sm leading-relaxed text-tinta-suave">
            Muy pronto: ensayos de acceso libre para leer aquí mismo, sin comprar.
          </p>
        }
      >
        <For each={items()}>{(item) => <ShelfCard item={item} free />}</For>
      </Show>
    </Carousel>
  );
}
