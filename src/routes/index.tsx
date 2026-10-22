import { A, createAsync, query, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import { BookCover } from "~/components/catalog/BookCover";
import { BookRow } from "~/components/catalog/BookRow";
import { SiteFooter } from "~/components/catalog/SiteFooter";
import { SiteHeader } from "~/components/catalog/SiteHeader";
import { ButtonLink } from "~/components/ui/Button";
import { Seo } from "~/components/ui/Seo";
import { collectionName, formatAuthors, getFeaturedBook, getHomeRows } from "~/lib/catalog";
import { SITE_NAME, absoluteUrl } from "~/lib/site";

const loadHome = query(async () => {
  const [featured, rows] = await Promise.all([getFeaturedBook(), getHomeRows()]);
  return { featured, rows };
}, "home");

export const route = { preload: () => loadHome() } satisfies RouteDefinition;

export default function Home() {
  const data = createAsync(() => loadHome());

  return (
    <div class="min-h-screen">
      <Seo
        title={`${SITE_NAME} · Lectura digital de Editorial Huapango`}
        description="La plataforma de lectura de Editorial Huapango: literatura independiente del noreste mexicano en tu teléfono, tableta o computadora."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl("/"),
          inLanguage: "es-MX",
          publisher: { "@type": "Organization", name: "Editorial Huapango" },
        }}
      />
      <SiteHeader />

      <Show when={data()}>
        {(d) => (
          <>
            <section aria-labelledby="hero-title" class="border-b border-carbon-800">
              <div class="mx-auto flex max-w-[1360px] flex-col-reverse items-center gap-10 px-4 pb-14 pt-10 sm:px-10 md:flex-row md:gap-16 md:pb-20 md:pt-[72px]">
                <div class="flex min-w-0 flex-[999_1_520px] flex-col items-center gap-5 text-center md:items-start md:gap-6 md:text-left">
                  <p class="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-terregal-400 sm:text-xs">
                    <span class="hidden h-px w-8 bg-terregal-400 md:block" aria-hidden="true" />
                    Destacado · Colección {collectionName(d().featured.collection)}
                  </p>
                  <h1
                    id="hero-title"
                    class="font-serif text-[52px] font-light leading-none tracking-tight sm:text-7xl lg:text-[88px]"
                  >
                    {d().featured.title}
                  </h1>
                  <p class="text-sm text-carbon-300 sm:text-base">
                    {formatAuthors(d().featured.authors)} · {d().featured.genres[0]}
                  </p>
                  <blockquote class="hidden max-w-[620px] font-serif text-[22px] italic leading-relaxed text-bond-300 md:block">
                    {d().featured.quote}
                  </blockquote>
                  <p class="max-w-[580px] text-[15px] leading-7 text-carbon-300">
                    {d().featured.synopsis}
                  </p>
                  <div class="flex w-full flex-wrap justify-center gap-3 pt-2 md:w-auto md:justify-start">
                    <ButtonLink href="/leer/demo" class="flex-1 md:flex-none">
                      Leer muestra
                    </ButtonLink>
                    <ButtonLink
                      href={`/libro/${d().featured.slug}`}
                      variant="secondary"
                      class="flex-1 md:flex-none"
                    >
                      Ver ficha
                    </ButtonLink>
                  </div>
                </div>
                <A
                  href={`/libro/${d().featured.slug}`}
                  class="group block w-[210px] shrink-0 sm:w-[280px] md:w-[340px]"
                  aria-label={`Ver ficha de ${d().featured.title}`}
                >
                  <BookCover
                    book={d().featured}
                    sizes="(min-width: 768px) 340px, (min-width: 640px) 280px, 210px"
                    priority
                    shadow="hero"
                    class="transition-transform duration-300 group-hover:-translate-y-1.5"
                  />
                </A>
              </div>
            </section>

            <main class="mx-auto flex max-w-[1360px] flex-col gap-10 py-10 sm:gap-14 sm:py-14">
              <For each={d().rows}>{(row) => <BookRow row={row} />}</For>
            </main>
          </>
        )}
      </Show>

      <SiteFooter />
    </div>
  );
}
