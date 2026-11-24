import { A } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";
import { ImprimirModal, type ObraParaImprimir } from "~/components/panel/ImprimirModal";
import { ObrasNube } from "~/components/panel/ObrasNube";
import { PanelShell } from "~/components/panel/PanelShell";
import { collectionName, formatAuthors } from "~/lib/catalog";
import { BOOKS } from "~/lib/catalog/data";
import { MANIFESTS } from "~/lib/contenido/manifests.generated";
import { readHref } from "~/lib/contenido";

/** Biblioteca del panel: las obras con contenido importado y sus piezas. */
export default function PanelHome() {
  const [imprimir, setImprimir] = createSignal<ObraParaImprimir | null>(null);
  const obras = Object.entries(MANIFESTS).map(([obra, manifest]) => ({
    obra,
    manifest,
    book: BOOKS.find((b) => b.read?.obra === obra),
    words: manifest.pieces.reduce((n, p) => n + p.stats.words, 0),
  }));

  return (
    <PanelShell title="Biblioteca" path="/panel">
      <main class="mx-auto flex w-full max-w-[1500px] flex-col gap-10 px-4 py-10 sm:px-8">
        <div class="flex flex-col gap-2">
          <h1 class="font-serif text-4xl font-light tracking-tight">Biblioteca</h1>
          <p class="max-w-[720px] text-[15px] leading-relaxed text-tinta-suave">
            Tus libros y ensayos. Abre una pieza para editarla: el panel revisa tu texto mientras
            escribes, y cada vez que guardas queda una versión.
          </p>
        </div>

        <ObrasNube />

        <div class="flex flex-col gap-1">
          <h2 class="m-0 font-serif text-2xl font-normal">Libros de la demostración</h2>
          <p class="m-0 max-w-[680px] text-[13px] leading-relaxed text-tinta-suave">
            Los que hoy se leen en el sitio. Para trabajarlos con versiones y publicarlos desde
            aquí, impórtalos desde su EPUB.
          </p>
        </div>
        <ul class="m-0 flex list-none flex-col gap-6 p-0">
          <For each={obras}>
            {(o) => (
              <li class="flex flex-wrap gap-6 rounded-sm border border-linea bg-superficie p-5 sm:p-6">
                <Show when={o.book}>
                  {(book) => (
                    <img
                      src={book().cover.webpSmall}
                      alt={`Portada de ${book().title}`}
                      width="104"
                      height="150"
                      class="h-[150px] w-[104px] shrink-0 rounded-sm object-cover shadow-book"
                    />
                  )}
                </Show>
                <div class="flex min-w-0 flex-1 flex-col gap-4">
                  <div class="flex flex-wrap items-baseline justify-between gap-3">
                    <div class="flex flex-col gap-1">
                      <h2 class="m-0 font-serif text-2xl font-normal">{o.book?.title ?? o.obra}</h2>
                      <span class="text-[13px] text-tinta-suave">
                        {o.manifest.pieces.length} piezas · {o.words.toLocaleString("es-MX")}{" "}
                        palabras
                      </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setImprimir({
                            slug: o.obra,
                            origen: "demo",
                            titulo: o.book?.title ?? o.obra,
                            autor: o.book ? formatAuthors(o.book.authors) : "",
                            coleccion: o.book ? collectionName(o.book.collection) : null,
                            creditos:
                              o.book?.contributors.map((c) => ({ rol: c.role, nombre: c.name })) ??
                              [],
                          })
                        }
                        class="h-8 rounded-sm border border-borde px-3 text-xs font-semibold text-tinta hover:border-borde-hover"
                      >
                        Imprimir (PDF)
                      </button>
                      <span class="rounded-full border border-linea-fuerte px-3 py-1 text-xs text-tinta-2">
                        En el sitio
                      </span>
                    </div>
                  </div>
                  <ul class="m-0 flex list-none flex-col divide-y divide-linea border-y border-linea p-0">
                    <For each={o.manifest.pieces}>
                      {(p) => (
                        <li class="flex flex-wrap items-center justify-between gap-3 py-3">
                          <span class="flex min-w-0 flex-col">
                            <span class="font-serif text-lg text-tinta">{p.title}</span>
                            <span class="text-[13px] text-tinta-suave">
                              {p.kind === "libro"
                                ? "El libro"
                                : p.kind === "ensayo"
                                  ? "Ensayo"
                                  : "Complemento"}
                              {p.credit ? ` · ${p.credit}` : ""} ·{" "}
                              {p.stats.words.toLocaleString("es-MX")} palabras · {p.stats.minutes}{" "}
                              min
                            </span>
                          </span>
                          <span class="flex gap-2">
                            <A
                              href={readHref(o.obra, p.kind === "complemento" ? p.slug : undefined)}
                              class="rounded-sm border border-linea-fuerte px-4 py-2 text-[13px] font-semibold text-tinta-2 no-underline hover:border-borde-hover"
                            >
                              Leer
                            </A>
                            <A
                              href={`/panel/${o.obra}/${p.slug}`}
                              class="rounded-sm bg-acento-fondo px-4 py-2 text-[13px] font-semibold text-white no-underline hover:bg-acento-fondo-hover"
                            >
                              Editar
                            </A>
                          </span>
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
              </li>
            )}
          </For>
        </ul>
        <Show when={imprimir()}>
          {(o) => <ImprimirModal obra={o()} onClose={() => setImprimir(null)} />}
        </Show>
      </main>
    </PanelShell>
  );
}
