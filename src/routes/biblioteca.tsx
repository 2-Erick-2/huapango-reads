import { A } from "@solidjs/router";
import { For, Show, createEffect, createMemo, createSignal, onMount } from "solid-js";
import { BookCover } from "~/components/catalog/BookCover";
import { EssayShelf } from "~/components/catalog/ReadShelf";
import { SiteFooter } from "~/components/catalog/SiteFooter";
import { SiteHeader } from "~/components/catalog/SiteHeader";
import { Button, ButtonLink } from "~/components/ui/Button";
import { Seo } from "~/components/ui/Seo";
import { formatAuthors, getBooks, type Book } from "~/lib/catalog";
import { readHref } from "~/lib/contenido";
import { inProgress, type ShelfItem } from "~/lib/contenido/shelves";
import {
  activarInvitado,
  cargarProgresoNube,
  estadoCuenta,
  iniciarCuentaLector,
  salirCuenta,
  type ProgresoNube,
} from "~/lib/lector/cuenta";
import { loadPosition } from "~/lib/reader/position";

interface LecturaEstante {
  obra: string;
  pieza: string;
  titulo: string;
  subtitulo: string;
  href: string;
  ratio: number;
  book?: Book;
}

export default function BibliotecaPage() {
  onMount(() => iniciarCuentaLector());

  const [locales, setLocales] = createSignal<ShelfItem[]>([]);
  const [nube, setNube] = createSignal<ProgresoNube[]>([]);
  const [catalogo, setCatalogo] = createSignal<Book[]>([]);

  onMount(async () => {
    setLocales(inProgress(loadPosition));
    setCatalogo(await getBooks());
  });

  createEffect(() => {
    if (estadoCuenta().modo === "sesion") {
      void cargarProgresoNube().then((rows) => setNube(rows));
    } else {
      setNube([]);
    }
  });

  const enLectura = createMemo<LecturaEstante[]>(() => {
    const porPieza = new Map<string, LecturaEstante>();

    for (const item of locales()) {
      porPieza.set(item.slug, {
        obra: item.obra,
        pieza: item.slug,
        titulo: item.title,
        subtitulo:
          item.kind === "libro"
            ? (item.book?.authors.join(" & ") ?? item.bookTitle)
            : (item.credit ?? item.bookTitle),
        href: readHref(item.obra, item.kind === "complemento" ? item.slug : undefined),
        ratio: item.progress ?? 0,
        book: item.book,
      });
    }

    const libros = catalogo();
    for (const row of nube()) {
      const libro = libros.find((b) => b.slug === row.obra_slug);
      const existente = porPieza.get(row.pieza_slug);
      if (existente) {
        if (row.ratio > existente.ratio) {
          porPieza.set(row.pieza_slug, { ...existente, ratio: row.ratio });
        }
        continue;
      }
      porPieza.set(row.pieza_slug, {
        obra: row.obra_slug,
        pieza: row.pieza_slug,
        titulo: libro?.title ?? row.obra_slug,
        subtitulo: libro ? formatAuthors(libro.authors) : "Lectura guardada",
        href:
          libro && libro.read && libro.read.slug !== row.pieza_slug
            ? readHref(row.obra_slug, row.pieza_slug)
            : readHref(row.obra_slug),
        ratio: row.ratio,
        book: libro,
      });
    }

    return [...porPieza.values()].filter((x) => x.ratio > 0 && x.ratio < 1);
  });

  return (
    <div class="flex min-h-screen flex-col">
      <Seo
        title="Mi biblioteca · Huapango +reads"
        description="Tu estante personal de lecturas, ensayos y progreso guardado en Editorial Huapango."
        path="/biblioteca"
        noindex
      />
      <SiteHeader />

      <main class="flex-1">
        {/* Cabecera de cuenta / modo invitado */}
        <section class="textura-papel border-b border-linea">
          <div class="mx-auto flex max-w-[1360px] flex-col justify-between gap-6 px-4 py-10 sm:px-10 md:flex-row md:items-end md:py-14">
            <div class="flex max-w-[680px] flex-col gap-3">
              <p class="m-0 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.26em] text-acento">
                <span class="h-px w-8 bg-acento-vivo" aria-hidden="true" />
                {estadoCuenta().modo === "sesion"
                  ? "Cuenta activa"
                  : estadoCuenta().modo === "invitado"
                    ? "Modo invitado"
                    : "Estante personal"}
              </p>
              <h1 class="m-0 font-serif text-[40px] font-light leading-[1.04] tracking-tight text-tinta sm:text-5xl">
                <Show
                  when={estadoCuenta().modo === "sesion" && estadoCuenta().lector}
                  fallback={
                    estadoCuenta().modo === "invitado"
                      ? "Lectura en modo invitado"
                      : "Mi biblioteca"
                  }
                >
                  {(lector) => <>Biblioteca de {lector().nombre}</>}
                </Show>
              </h1>
              <p class="m-0 text-sm leading-relaxed text-tinta-suave sm:text-base">
                <Show
                  when={estadoCuenta().modo === "sesion"}
                  fallback={
                    estadoCuenta().modo === "invitado"
                      ? "Estás explorando el catálogo sin cuenta. Tu progreso de lectura se recuerda en este navegador."
                      : "Inicia sesión para sincronizar tus lecturas en la nube o activa el modo invitado para probar el catálogo ahora."
                  }
                >
                  Sesión iniciada como{" "}
                  <span class="font-medium text-tinta">{estadoCuenta().lector?.correo}</span>. Tu
                  avance se sincroniza automáticamente mientras lees.
                </Show>
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <Show when={estadoCuenta().modo === "sesion"}>
                <ButtonLink href="/" variant="ghost">
                  Explorar catálogo
                </ButtonLink>
                <Button variant="secondary" onClick={() => void salirCuenta()}>
                  Cerrar sesión
                </Button>
              </Show>

              <Show when={estadoCuenta().modo === "invitado"}>
                <ButtonLink href="/entrar">Crear cuenta para sincronizar</ButtonLink>
                <Button variant="ghost" onClick={() => void salirCuenta()}>
                  Salir de invitado
                </Button>
              </Show>

              <Show when={estadoCuenta().modo === "anonimo" || estadoCuenta().modo === "cargando"}>
                <ButtonLink href="/entrar">Entrar o registrarme</ButtonLink>
                <Button variant="ghost" onClick={() => activarInvitado()}>
                  Modo invitado
                </Button>
              </Show>
            </div>
          </div>
        </section>

        <div class="mx-auto flex max-w-[1360px] flex-col gap-12 px-4 py-10 sm:px-10 md:py-14">
          {/* 1 · Lecturas en curso */}
          <section aria-labelledby="en-lectura" class="flex flex-col gap-6">
            <div class="flex flex-wrap items-baseline justify-between gap-4 border-b border-linea pb-3">
              <h2
                id="en-lectura"
                class="m-0 font-serif text-[26px] font-light leading-tight text-tinta sm:text-[32px]"
              >
                En lectura
              </h2>
              <span class="text-xs uppercase tracking-[0.18em] text-tinta-tenue">
                {enLectura().length} {enLectura().length === 1 ? "título" : "títulos"}
              </span>
            </div>

            <Show
              when={enLectura().length > 0}
              fallback={
                <div class="flex flex-col items-start gap-4 rounded-sm border border-dashed border-borde bg-superficie p-6 sm:p-8">
                  <p class="m-0 max-w-[560px] font-serif text-xl font-light text-tinta">
                    Todavía no tienes páginas marcadas en este dispositivo.
                  </p>
                  <p class="m-0 max-w-[560px] text-sm leading-relaxed text-tinta-suave">
                    Abre cualquier muestra del catálogo o alguno de los ensayos gratuitos abajo; en
                    cuanto pases una página aparecerá aquí para retomarla donde la dejaste.
                  </p>
                  <ButtonLink href="/" variant="ghost">
                    Ir al catálogo
                  </ButtonLink>
                </div>
              }
            >
              <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <For each={enLectura()}>
                  {(item) => {
                    const pct = Math.round(item.ratio * 100);
                    return (
                      <A
                        href={item.href}
                        class="group flex items-center gap-5 rounded-sm border border-linea bg-superficie p-4 no-underline transition-colors hover:border-borde-hover"
                      >
                        <div class="w-20 shrink-0">
                          <Show
                            when={item.book}
                            fallback={
                              <div class="book-spine flex aspect-[25/36] items-center justify-center rounded-sm bg-papel p-2 text-center shadow-book">
                                <span class="font-serif text-xs italic text-papel-acento">
                                  +reads
                                </span>
                              </div>
                            }
                          >
                            {(book) => <BookCover book={book()} sizes="80px" />}
                          </Show>
                        </div>
                        <div class="flex min-w-0 flex-1 flex-col gap-2">
                          <p class="m-0 truncate font-serif text-xl font-normal text-tinta">
                            {item.titulo}
                          </p>
                          <p class="m-0 truncate text-xs text-tinta-suave">{item.subtitulo}</p>
                          <div class="mt-1 flex flex-col gap-1.5">
                            <div class="h-[3px] overflow-hidden rounded-sm bg-control">
                              <div class="h-full bg-acento-vivo" style={{ width: `${pct}%` }} />
                            </div>
                            <span class="text-xs font-medium text-acento">
                              {pct} % leído · Continuar
                            </span>
                          </div>
                        </div>
                      </A>
                    );
                  }}
                </For>
              </div>
            </Show>
          </section>

          {/* 2 · Adquisiciones futuras sin inventar compras */}
          <section aria-labelledby="adquiridos" class="flex flex-col gap-4">
            <h2
              id="adquiridos"
              class="m-0 border-b border-linea pb-3 font-serif text-[26px] font-light leading-tight text-tinta sm:text-[32px]"
            >
              Ediciones adquiridas
            </h2>
            <div class="rounded-sm border border-linea bg-superficie px-6 py-6">
              <p class="m-0 max-w-[640px] text-sm leading-relaxed text-tinta-suave">
                Cuando la tienda digital abra sus compras directas, aquí se reunirán tus libros
                completos para leerlos en cualquier pantalla o regalar un código de acceso.
              </p>
            </div>
          </section>
        </div>

        {/* 3 · Ensayos de acceso libre */}
        <EssayShelf />
      </main>

      <SiteFooter />
    </div>
  );
}
