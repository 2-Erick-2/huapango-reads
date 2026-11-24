import { A, createAsync, query, useParams, type RouteDefinition } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { For, Show, createMemo, createSignal, onMount } from "solid-js";
import { BookCover } from "~/components/catalog/BookCover";
import { PiezaCard } from "~/components/catalog/PiezaCard";
import { SiteFooter } from "~/components/catalog/SiteFooter";
import { SiteHeader } from "~/components/catalog/SiteHeader";
import { Button, ButtonLink } from "~/components/ui/Button";
import { Seo } from "~/components/ui/Seo";
import { Stars } from "~/components/ui/Stars";
import {
  collectionName,
  formatAuthors,
  formatDate,
  formatDigitalPrice,
  getBook,
  getRelatedBooks,
} from "~/lib/catalog";
import { getReviews, ratingSummary } from "~/lib/club";
import {
  bookReadHref,
  complementos,
  getManifest,
  mainEntry,
  piezaTag,
  readHref,
} from "~/lib/contenido";
import { estadoCuenta, iniciarCuentaLector } from "~/lib/lector/cuenta";
import { loadPosition, minutesLeft } from "~/lib/reader/position";
import { absoluteUrl, originUrl, PUBLISHER_URL } from "~/lib/site";

const loadBook = query(async (slug: string) => {
  const book = await getBook(slug);
  if (!book) return null;
  return { book, related: await getRelatedBooks(book), reviews: await getReviews(book.slug) };
}, "book");

export const route = {
  preload: ({ params }) => loadBook(params.slug ?? ""),
} satisfies RouteDefinition;

/** Rótulo de sección: etiqueta en versalitas terregal con su línea, como en el resto del sitio. */
function Label(props: { id: string; children: string }) {
  return (
    <h2
      id={props.id}
      class="m-0 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-acento sm:text-xs"
    >
      <span class="h-px w-6 bg-acento-vivo sm:w-8" aria-hidden="true" />
      {props.children}
    </h2>
  );
}

function Fact(props: { label: string; value: string; muted?: boolean }) {
  return (
    <div class="flex flex-col gap-1.5">
      <dt class="text-[11px] font-semibold uppercase tracking-[0.2em] text-tinta-tenue">
        {props.label}
      </dt>
      <dd class={`m-0 text-[15px] ${props.muted ? "text-tinta-suave" : "text-tinta"}`}>
        {props.value}
      </dd>
    </div>
  );
}

function BookIcon(props: { size: number }) {
  return (
    <svg
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2 5.5C4.5 4.5 8 4.5 12 7c4-2.5 7.5-2.5 10-1.5V19c-2.5-1-6-1-10 1.5-4-2.5-7.5-2.5-10-1.5z" />
      <path d="M12 7v13.5" />
    </svg>
  );
}

export default function BookPage() {
  const params = useParams();
  const data = createAsync(() => loadBook(params.slug ?? ""));

  return (
    <div class="min-h-screen">
      <SiteHeader />
      <Show
        when={data()}
        fallback={
          <Show when={data() === null}>
            <HttpStatusCode code={404} />
            <Seo
              title="Libro no encontrado · Huapango +reads"
              description="Este libro no existe en el catálogo."
              path={`/libro/${params.slug}`}
              noindex
            />
            <main class="mx-auto max-w-[1360px] px-4 py-24 text-center sm:px-10">
              <h1 class="font-serif text-4xl font-light">No encontramos este libro</h1>
              <p class="mt-4 text-tinta-suave">
                <A href="/" class="text-acento">
                  Volver al catálogo
                </A>
              </p>
            </main>
          </Show>
        }
      >
        {(d) => <BookView data={d()} />}
      </Show>
      <SiteFooter />
    </div>
  );
}

type BookData = NonNullable<Awaited<ReturnType<typeof loadBook>>>;

function BookView(props: { data: BookData }) {
  const book = () => props.data.book;
  const reviews = () => props.data.reviews;
  const rating = createMemo(() => ratingSummary(reviews()));

  const manifest = createMemo(() => {
    const read = book().read;
    return read ? getManifest(read.obra) : undefined;
  });
  const piezas = createMemo(() => {
    const m = manifest();
    if (m) {
      return complementos(m).map((p) => ({
        slug: p.slug,
        title: p.title,
        credit: p.credit,
        minutes: p.stats.minutes as number | null,
      }));
    }
    return (book().cloudPieces ?? []).map((p) => ({
      slug: p.slug,
      title: p.title,
      credit: p.credit,
      minutes: null as number | null,
    }));
  });
  const minutes = createMemo(() => {
    const m = manifest();
    return m ? (mainEntry(m)?.stats.minutes ?? null) : null;
  });

  // Avance de lectura: solo existe en el navegador (localStorage), así que se lee al montar.
  const [progress, setProgress] = createSignal<number | null>(null);
  const [expanded, setExpanded] = createSignal(false);
  onMount(() => {
    iniciarCuentaLector();
    const read = book().read;
    if (read) setProgress(loadPosition(read.slug));
  });
  const started = () => {
    const p = progress();
    return p !== null && p > 0 && p < 1;
  };
  const percent = () => Math.round((progress() ?? 0) * 100);
  const left = () => (minutes() === null ? null : minutesLeft(minutes() ?? 0, progress() ?? 0));
  const publicacion = () => {
    const iso = book().publishedAt;
    return iso ? formatDate(iso) : null;
  };
  const readLabel = () =>
    started() ? "Continuar leyendo" : book().read ? "Leer ahora" : "Leer muestra";

  return (
    <>
      <Seo
        title={`${book().title} · ${formatAuthors(book().authors)} · Huapango +reads`}
        description={book().synopsis}
        path={`/libro/${book().slug}`}
        image={book().cover.jpg || undefined}
        type="book"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Book",
          name: book().subtitle ? `${book().title}: ${book().subtitle}` : book().title,
          author: book().authors.map((name) => ({ "@type": "Person", name })),
          publisher: { "@type": "Organization", name: "Editorial Huapango", url: PUBLISHER_URL },
          ...(book().publishedAt ? { datePublished: book().publishedAt } : {}),
          inLanguage: "es",
          genre: book().genres,
          ...(book().cover.jpg ? { image: originUrl(book().cover.jpg) } : {}),
          url: absoluteUrl(`/libro/${book().slug}`),
          description: book().synopsis,
        }}
      />

      {/* 1 · En breve */}
      <section aria-labelledby="enbreve" class="border-b border-linea bg-superficie">
        <div class="mx-auto flex max-w-[1360px] flex-col gap-3 px-6 py-6 sm:px-10 md:flex-row md:items-baseline md:gap-14 md:py-8">
          <div class="shrink-0">
            <Label id="enbreve">En breve</Label>
          </div>
          <div class="flex max-w-[920px] flex-col gap-3">
            <p
              class="m-0 font-serif text-[19px] font-normal leading-[1.5] text-tinta-2 md:text-[25px] md:font-light md:leading-[1.45]"
              classList={{ "line-clamp-4 md:line-clamp-none": !expanded() }}
            >
              {book().synopsis}
            </p>
            <button
              type="button"
              class="self-start text-[13px] font-semibold text-acento underline underline-offset-4 md:hidden"
              aria-expanded={expanded()}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded() ? "Ocultar sinopsis" : "Leer sinopsis completa"}
            </button>
          </div>
        </div>
      </section>

      <main class="flex flex-col">
        <div class="mx-auto w-full max-w-[1360px]">
          {/* 2 · Portada, título y lectura */}
          <section
            aria-labelledby="titulo"
            class="grid grid-cols-[136px_1fr] gap-x-5 gap-y-6 px-6 pb-12 pt-8 sm:grid-cols-[240px_1fr] sm:px-10 md:grid-cols-[340px_1fr] md:gap-x-20 md:gap-y-8 md:pb-16 md:pt-16"
          >
            <div class="relative self-start w-[136px] sm:w-[240px] md:row-span-2 md:w-[340px]">
              <BookCover
                book={book()}
                sizes="(min-width: 768px) 340px, (min-width: 640px) 240px, 136px"
                priority
                shadow="hero"
              />
              <A
                href={bookReadHref(book())}
                aria-label={`Leer ${book().title}`}
                class="absolute -bottom-2.5 -right-2.5 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-fondo bg-acento-vivo text-white shadow-book no-underline transition-colors hover:bg-acento-fondo md:-bottom-[18px] md:-right-[18px] md:h-16 md:w-16 md:border-4"
              >
                <span class="md:hidden">
                  <BookIcon size={20} />
                </span>
                <span class="hidden md:inline">
                  <BookIcon size={26} />
                </span>
              </A>
            </div>

            <div class="flex min-w-0 flex-1 flex-col gap-3 pt-0.5 md:gap-6">
              <nav
                aria-label="Ruta"
                class="text-[10.5px] font-bold uppercase tracking-[0.2em] text-tinta-tenue md:text-xs md:tracking-[0.24em]"
              >
                <A
                  href="/"
                  class="hidden text-tinta-tenue no-underline hover:text-tinta-2 md:inline"
                >
                  Catálogo /{" "}
                </A>
                <span class="text-acento">Colección {collectionName(book().collection)}</span>
              </nav>
              <h1
                id="titulo"
                class="m-0 font-serif text-[44px] font-light leading-[0.96] tracking-tight sm:text-6xl lg:text-[96px] lg:leading-[0.92]"
              >
                {book().title}
              </h1>
              <Show when={book().subtitle}>
                <p class="m-0 font-serif text-xl font-light italic text-tinta-2 md:text-3xl">
                  {book().subtitle}
                </p>
              </Show>
              <Show when={book().hashtag}>
                <p class="m-0 font-serif text-xl font-semibold text-tinta md:text-2xl">
                  {book().hashtag}
                </p>
              </Show>
              <div class="flex flex-col gap-1.5">
                <p class="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-tinta-2 md:text-[17px] md:tracking-[0.16em]">
                  {formatAuthors(book().authors)}
                </p>
                <For each={book().contributors.slice(0, 1)}>
                  {(c) => (
                    <p class="m-0 text-xs leading-snug text-tinta-suave md:text-[15px]">
                      {c.role} por {c.name}
                    </p>
                  )}
                </For>
              </div>
              <div class="mt-1 flex flex-col gap-1 md:mt-4">
                <span class="font-serif text-[52px] font-light italic leading-none tracking-tight text-acento sm:text-[72px] lg:text-[120px]">
                  +reads
                </span>
                <span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-tinta-tenue md:text-xs">
                  Edición digital
                </span>
              </div>
            </div>

            <div class="col-span-2 flex flex-col gap-6 md:col-span-1 md:col-start-2 md:self-end">
              <div class="flex flex-wrap gap-2 border-t border-linea pt-5 md:pt-6">
                <For each={book().genres}>
                  {(g) => (
                    <span class="rounded-full border border-linea-fuerte px-3 py-1.5 text-xs text-tinta-2">
                      {g}
                    </span>
                  )}
                </For>
                <Show when={minutes()}>
                  {(m) => (
                    <span class="rounded-full border border-linea-fuerte px-3 py-1.5 text-xs text-tinta-2">
                      ≈ {m()} min de lectura
                    </span>
                  )}
                </Show>
              </div>

              {/* Avance y botón principal */}
              <div class="flex flex-wrap items-end gap-x-8 gap-y-4">
                <Show when={started()}>
                  <div class="flex w-full max-w-[380px] flex-col gap-2">
                    <div class="flex justify-between text-xs text-tinta-suave">
                      <span class="font-semibold text-tinta-2">{percent()} % leído</span>
                      <Show when={left()}>
                        <span>Te quedan unos {left()} min</span>
                      </Show>
                    </div>
                    <div
                      class="h-[3px] overflow-hidden rounded-sm bg-control"
                      role="progressbar"
                      aria-label="Progreso de lectura"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent()}
                    >
                      <div class="h-full bg-acento-vivo" style={{ width: `${percent()}%` }} />
                    </div>
                  </div>
                </Show>
                <div class="flex w-full flex-wrap gap-3 md:w-auto">
                  <ButtonLink href={bookReadHref(book())} class="h-[54px] flex-1 md:flex-none">
                    <BookIcon size={18} />
                    {readLabel()}
                  </ButtonLink>
                  <Button
                    disabled
                    title="La compra estará disponible muy pronto"
                    class="h-[54px] flex-1 md:flex-none"
                  >
                    Comprar · pronto
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 3 · Piezas del libro y audiolibro */}
        <section class="border-y border-linea bg-superficie">
          <div class="mx-auto flex max-w-[1360px] flex-wrap items-stretch gap-x-[72px] gap-y-10 px-6 py-10 sm:px-10 md:py-12">
            <Show when={piezas().length > 0}>
              <div
                role="group"
                aria-labelledby="piezas"
                class="flex min-w-0 flex-[999_1_480px] flex-col gap-6"
              >
                <div class="flex items-baseline justify-between gap-4">
                  <Label id="piezas">Dentro de este libro</Label>
                  <span class="text-[13px] text-tinta-tenue">
                    {piezas().length} {piezas().length === 1 ? "pieza" : "piezas"}
                  </span>
                </div>
                <div class="flex flex-wrap gap-x-8 gap-y-6">
                  <For each={piezas()}>
                    {(p) => (
                      <PiezaCard
                        href={
                          manifest()
                            ? readHref(book().read?.obra ?? "", p.slug)
                            : readHref(book().read?.obra ?? book().slug)
                        }
                        tag={piezaTag(p.title)}
                        title={p.title}
                        credit={p.credit}
                        minutes={p.minutes}
                      />
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <div
              role="group"
              aria-labelledby="audio"
              class="flex min-w-0 max-w-[460px] flex-[1_1_340px] flex-col justify-center gap-4 rounded-sm border border-linea-fuerte bg-fondo p-6 md:p-8"
            >
              <div class="flex flex-wrap items-center gap-3">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="text-aviso"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 15v-3a8 8 0 0116 0v3" />
                  <rect x="3" y="14" width="4" height="6" rx="1.2" />
                  <rect x="17" y="14" width="4" height="6" rx="1.2" />
                </svg>
                <h2
                  id="audio"
                  class="m-0 text-[13px] font-bold uppercase tracking-[0.22em] text-tinta"
                >
                  Audiolibro
                </h2>
                <span class="rounded-full border border-aviso-borde px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-aviso">
                  Próximamente
                </span>
              </div>
              <p class="m-0 font-serif text-2xl font-light leading-tight text-tinta">
                Escucha el libro cuando esté listo.
              </p>
              <p class="m-0 text-sm leading-relaxed text-tinta-suave">
                Te avisaremos al correo de tu cuenta en cuanto la editorial publique la versión en
                audio.
              </p>
              <Button
                variant="ghost"
                disabled
                title="Muy pronto podrás escribir tu reseña"
                class="self-start"
              >
                Avísame
              </Button>
            </div>
          </div>
        </section>

        <div class="mx-auto w-full max-w-[1360px]">
          {/* 4 · Club de lectura */}
          <section
            id="club"
            aria-labelledby="club-t"
            class="flex flex-wrap items-start gap-x-24 gap-y-12 px-6 py-12 sm:px-10 md:py-[72px]"
          >
            <div class="flex min-w-0 max-w-[420px] flex-[1_1_340px] flex-col gap-6">
              <div class="flex flex-col gap-3">
                <div class="flex items-baseline justify-between gap-4">
                  <Label id="club-t">Club de lectura</Label>
                  <span class="text-xs tracking-wide text-tinta-tenue">Vista de ejemplo</span>
                </div>
                <p class="m-0 font-serif text-[27px] font-light leading-[1.12] tracking-tight md:text-[40px] md:leading-[1.08]">
                  Lo que dicen quienes ya lo leyeron
                </p>
              </div>

              <Show when={rating().average}>
                {(avg) => (
                  <div class="flex items-center gap-5 border-y border-linea py-4">
                    <span class="font-serif text-[52px] font-light leading-none md:text-[64px]">
                      {avg().toFixed(1)}
                    </span>
                    <div class="flex flex-col gap-2">
                      <Stars rating={avg()} size={20} />
                      <span class="text-[13px] text-tinta-suave">
                        {rating().count} {rating().count === 1 ? "reseña" : "reseñas"} con compra
                        verificada
                      </span>
                    </div>
                  </div>
                )}
              </Show>

              <div class="flex flex-col gap-3.5 rounded-sm border border-dashed border-borde p-5">
                <div class="flex items-center gap-2.5">
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="text-aviso"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="5" y="11" width="14" height="9" rx="1.5" />
                    <path d="M8 11V8a4 4 0 018 0v3" />
                  </svg>
                  <span class="text-[15px] font-semibold text-tinta">
                    Tu reseña se abre al terminar el libro
                  </span>
                </div>
                <p class="m-0 text-sm leading-relaxed text-tinta-suave">
                  El Club es solo para quienes compraron y leyeron el libro. Así cada opinión viene
                  de un lector de verdad.
                </p>
                <div class="flex flex-wrap items-center gap-3">
                  <Button disabled class="!normal-case !tracking-normal">
                    {started()
                      ? `Escribir mi reseña · te falta ${100 - percent()} %`
                      : "Escribir mi reseña"}
                  </Button>
                  <Show
                    when={estadoCuenta().modo === "anonimo" || estadoCuenta().modo === "invitado"}
                  >
                    <A
                      href="/entrar"
                      class="text-xs font-semibold text-acento underline underline-offset-4 hover:text-tinta"
                    >
                      Entrar con tu cuenta
                    </A>
                  </Show>
                </div>
              </div>
            </div>

            <ul class="m-0 flex min-w-0 flex-[999_1_480px] list-none flex-col p-0">
              <Show
                when={reviews().length > 0}
                fallback={
                  <li class="border-t border-linea py-8 text-[15px] leading-relaxed text-tinta-suave">
                    Aún no hay reseñas de este libro. Las primeras llegarán cuando haya lectores que
                    lo hayan comprado y terminado.
                  </li>
                }
              >
                <For each={reviews()}>
                  {(r) => (
                    <li class="flex flex-col gap-3 border-t border-linea py-7 first:border-t-0 md:py-8">
                      <div class="flex items-center justify-between gap-3">
                        <span class="text-sm font-bold tracking-[0.14em] text-tinta">{r.user}</span>
                        <span class="text-[13px] text-tinta-tenue">{r.when}</span>
                      </div>
                      <div class="flex items-center gap-3.5">
                        <Stars rating={r.stars} size={17} />
                        <Show when={r.verified}>
                          <span class="flex items-center gap-1.5 text-[12.5px] text-tinta-suave">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              class="text-aviso"
                              stroke-width="2.2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                            Compra verificada
                          </span>
                        </Show>
                      </div>
                      <p class="m-0 max-w-[680px] font-serif text-[17px] leading-[1.55] text-tinta-2 md:text-[21px]">
                        {r.text}
                      </p>
                      <button
                        type="button"
                        disabled
                        class="self-start py-2 text-[13px] font-semibold text-tinta-suave disabled:cursor-default"
                      >
                        Útil · {r.helpful}
                      </button>
                    </li>
                  )}
                </For>
              </Show>
            </ul>
          </section>

          {/* 5 · Ficha técnica (tienda) */}
          <section
            aria-labelledby="ficha"
            class="flex flex-col gap-6 border-t border-linea px-6 py-12 sm:px-10"
          >
            <Label id="ficha">Ficha del libro</Label>
            <div class="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div class="flex flex-col gap-1">
                <span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-tinta-tenue">
                  Edición digital
                </span>
                <span class="font-serif text-[26px] text-tinta">{formatDigitalPrice(book())}</span>
              </div>
              <Show when={book().print}>
                {(print) => (
                  <p class="m-0 text-sm text-tinta-tenue">
                    ¿Prefieres el libro impreso?{" "}
                    <a
                      href={print().mercadoLibreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-acento underline underline-offset-2 hover:text-tinta-2"
                    >
                      Cómpralo en Mercado Libre
                    </a>
                  </p>
                )}
              </Show>
            </div>
            <dl class="m-0 grid grid-cols-2 gap-6 rounded-sm border border-linea bg-superficie p-6 lg:grid-cols-3">
              <Fact label="Autor" value={formatAuthors(book().authors)} />
              <Fact
                label="Publicación"
                value={publicacion() ?? "Por confirmar"}
                muted={publicacion() === null}
              />
              <Fact label="Formato" value="Ebook · lectura en web" />
              <Fact label="Colección" value={collectionName(book().collection)} />
              <Show when={book().prologue}>
                {(p) => <Fact label="Prólogo" value={p().replace("Prólogo de ", "")} />}
              </Show>
              <Fact
                label="ISBN digital"
                value={book().digitalIsbn ?? "Por confirmar"}
                muted={!book().digitalIsbn}
              />
              <For each={book().contributors}>{(c) => <Fact label={c.role} value={c.name} />}</For>
              <Fact label="Editorial" value="Editorial Huapango" />
            </dl>
          </section>

          <Show when={props.data.related.length > 0}>
            <section aria-labelledby="mas" class="flex flex-col gap-5 px-6 pb-14 sm:px-10">
              <h2 id="mas" class="m-0 font-serif text-[28px] font-normal">
                Más de la Colección {collectionName(book().collection)}
              </h2>
              <div class="flex flex-wrap gap-6">
                <For each={props.data.related}>
                  {(r) => (
                    <A
                      href={`/libro/${r.slug}`}
                      class="group flex w-36 flex-col gap-3 no-underline sm:w-[200px]"
                    >
                      <BookCover
                        book={r}
                        sizes="(min-width: 640px) 200px, 144px"
                        class="transition-transform duration-300 group-hover:-translate-y-1.5"
                      />
                      <span class="font-serif text-[17px] font-semibold leading-tight text-tinta">
                        {r.title}
                      </span>
                      <span class="-mt-2 text-[13px] text-tinta-suave">
                        {formatAuthors(r.authors)}
                      </span>
                    </A>
                  )}
                </For>
              </div>
            </section>
          </Show>
        </div>
      </main>
    </>
  );
}
