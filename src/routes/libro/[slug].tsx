import { A, createAsync, query, useParams, type RouteDefinition } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { For, Show } from "solid-js";
import { BookCover } from "~/components/catalog/BookCover";
import { SiteFooter } from "~/components/catalog/SiteFooter";
import { SiteHeader } from "~/components/catalog/SiteHeader";
import { Button, ButtonLink } from "~/components/ui/Button";
import { Seo } from "~/components/ui/Seo";
import {
  collectionName,
  formatAuthors,
  formatDate,
  formatDigitalPrice,
  getBook,
  getRelatedBooks,
} from "~/lib/catalog";
import { absoluteUrl, PUBLISHER_URL } from "~/lib/site";

const loadBook = query(async (slug: string) => {
  const book = await getBook(slug);
  if (!book) return null;
  return { book, related: await getRelatedBooks(book) };
}, "book");

export const route = {
  preload: ({ params }) => loadBook(params.slug ?? ""),
} satisfies RouteDefinition;

function Fact(props: { label: string; value: string; muted?: boolean }) {
  return (
    <div class="flex flex-col gap-1.5">
      <dt class="text-[11px] font-semibold uppercase tracking-[0.2em] text-carbon-400">
        {props.label}
      </dt>
      <dd class={`m-0 text-[15px] ${props.muted ? "text-carbon-300" : "text-bond-100"}`}>
        {props.value}
      </dd>
    </div>
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
              <p class="mt-4 text-carbon-300">
                <A href="/" class="text-terregal-400">
                  Volver al catálogo
                </A>
              </p>
            </main>
          </Show>
        }
      >
        {(d) => {
          const book = () => d().book;
          return (
            <>
              <Seo
                title={`${book().title} · ${formatAuthors(book().authors)} · Huapango +reads`}
                description={book().synopsis}
                path={`/libro/${book().slug}`}
                image={book().cover.jpg}
                type="book"
                jsonLd={{
                  "@context": "https://schema.org",
                  "@type": "Book",
                  name: book().subtitle ? `${book().title}: ${book().subtitle}` : book().title,
                  author: book().authors.map((name) => ({ "@type": "Person", name })),
                  publisher: {
                    "@type": "Organization",
                    name: "Editorial Huapango",
                    url: PUBLISHER_URL,
                  },
                  datePublished: book().publishedAt,
                  inLanguage: "es",
                  genre: book().genres,
                  image: absoluteUrl(book().cover.jpg),
                  url: absoluteUrl(`/libro/${book().slug}`),
                  description: book().synopsis,
                }}
              />

              <main class="mx-auto flex max-w-[1360px] flex-col gap-16 px-4 pb-6 pt-10 sm:px-10 sm:pt-16">
                <section
                  aria-labelledby="titulo"
                  class="flex flex-col items-center gap-10 md:flex-row md:items-start md:gap-[72px]"
                >
                  <div class="w-[220px] shrink-0 sm:w-[300px] md:w-[360px] lg:w-[400px]">
                    <BookCover
                      book={book()}
                      sizes="(min-width: 1024px) 400px, (min-width: 768px) 360px, (min-width: 640px) 300px, 220px"
                      priority
                      shadow="hero"
                    />
                  </div>

                  <div class="flex min-w-0 flex-1 flex-col gap-7">
                    <div class="flex flex-col gap-4">
                      <nav
                        aria-label="Ruta"
                        class="text-xs font-bold uppercase tracking-[0.24em] text-carbon-400"
                      >
                        <A href="/" class="text-carbon-400 no-underline hover:text-bond-300">
                          Catálogo
                        </A>
                        {" / "}
                        <span class="text-terregal-400">
                          Colección {collectionName(book().collection)}
                        </span>
                      </nav>
                      <h1
                        id="titulo"
                        class="font-serif text-5xl font-light leading-none tracking-tight sm:text-7xl lg:text-[80px]"
                      >
                        {book().title}
                      </h1>
                      <Show when={book().subtitle}>
                        <p class="font-serif text-2xl font-light italic text-bond-300 sm:text-3xl">
                          {book().subtitle}
                        </p>
                      </Show>
                      <Show when={book().hashtag}>
                        <p class="font-serif text-2xl font-semibold text-bond-100">
                          {book().hashtag}
                        </p>
                      </Show>
                      <p class="text-lg text-bond-300">
                        Por <span class="font-semibold">{formatAuthors(book().authors)}</span>
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <For each={book().genres}>
                          {(g) => (
                            <span class="rounded-full border border-carbon-700 px-3 py-1.5 text-xs text-carbon-200">
                              {g}
                            </span>
                          )}
                        </For>
                        <span class="rounded-full border border-terregal-800 bg-terregal-900 px-3 py-1.5 text-xs text-terregal-400">
                          Colección {collectionName(book().collection)}
                          {book().collectionNumber
                            ? ` · No. ${String(book().collectionNumber).padStart(2, "0")}`
                            : ""}
                        </span>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-4 border-y border-carbon-800 py-6">
                      <div class="mr-4 flex flex-col gap-1">
                        <span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-carbon-400">
                          Edición digital
                        </span>
                        <span class="font-serif text-[26px] text-bond-100">
                          {formatDigitalPrice(book())}
                        </span>
                      </div>
                      <Button disabled title="La compra se habilita en el Hito 3">
                        Comprar · disponible pronto
                      </Button>
                      <ButtonLink href="/leer/demo">Leer muestra</ButtonLink>
                    </div>

                    <blockquote class="border-l-2 border-terregal-600 pl-6 font-serif text-xl italic leading-relaxed text-bond-300 sm:text-2xl">
                      {book().quote}
                    </blockquote>

                    <div class="flex flex-col gap-3">
                      <h2 class="text-xs font-bold uppercase tracking-[0.24em] text-terregal-400">
                        Sinopsis
                      </h2>
                      <p class="max-w-[680px] text-[17px] leading-[1.75] text-carbon-200">
                        {book().synopsis}
                      </p>
                    </div>

                    <dl class="m-0 grid grid-cols-2 gap-6 rounded-sm border border-carbon-800 bg-carbon-850 p-6 lg:grid-cols-3">
                      <Fact label="Autor" value={formatAuthors(book().authors)} />
                      <Fact label="Publicación" value={formatDate(book().publishedAt)} />
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
                      <Fact label="Editorial" value="Editorial Huapango" />
                    </dl>

                    <p class="text-sm text-carbon-400">
                      ¿Prefieres el libro impreso?{" "}
                      <a
                        href={book().print.mercadoLibreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-terregal-400 hover:text-bond-300"
                      >
                        Cómpralo en Mercado Libre
                      </a>
                    </p>
                  </div>
                </section>

                <Show when={d().related.length > 0}>
                  <section aria-labelledby="mas" class="flex flex-col gap-5">
                    <h2 id="mas" class="font-serif text-[28px] font-normal">
                      Más de la Colección {collectionName(book().collection)}
                    </h2>
                    <div class="flex flex-wrap gap-6">
                      <For each={d().related}>
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
                            <span class="font-serif text-[17px] font-semibold leading-tight text-bond-100">
                              {r.title}
                            </span>
                            <span class="-mt-2 text-[13px] text-carbon-300">
                              {formatAuthors(r.authors)}
                            </span>
                          </A>
                        )}
                      </For>
                    </div>
                  </section>
                </Show>
              </main>
            </>
          );
        }}
      </Show>
      <SiteFooter />
    </div>
  );
}
