import { HttpStatusCode } from "@solidjs/start";
import { A, createAsync, query } from "@solidjs/router";
import { Show, createEffect, createMemo, createSignal, on, onMount } from "solid-js";
import { Seo } from "~/components/ui/Seo";
import { getBookSync } from "~/lib/catalog";
import { assetUrl, findEntry, getManifest, loadPieza, mainEntry, readHref } from "~/lib/contenido";
import { ensayoPublicado, muestraLibroPublicado } from "~/lib/contenido/ensayos";
import { estadoCuenta, iniciarCuentaLector, sincronizarProgreso } from "~/lib/lector/cuenta";
import type { Pieza } from "~/lib/libro/types";
import { Reader, type ReaderContentItem } from "./Reader";

const today = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date());

function marcaDeAguaLectura(etiquetaBase: string): string {
  const cuenta = estadoCuenta();
  if (cuenta.modo === "sesion" && cuenta.lector) {
    return `${cuenta.lector.nombre} · ${cuenta.lector.correo} · ${today}`;
  }
  if (cuenta.modo === "invitado") {
    return `Modo invitado · ${etiquetaBase} · ${today}`;
  }
  return `${etiquetaBase} · ${today}`;
}

/**
 * Lector de una pieza de una obra importada (/leer/<obra> o /leer/<obra>/<pieza>).
 * El manifiesto está compilado en la app, así que el servidor ya sabe si la pieza existe y responde
 * 404 real; el texto se descarga en el navegador y el lector solo se monta cuando llega.
 * Sin login todavía: la marca de agua lleva datos de muestra (Hito 2: datos reales del lector).
 */
function NoEncontrada(props: { path: string }) {
  return (
    <>
      <HttpStatusCode code={404} />
      <Seo
        title="Lectura no encontrada · Huapango +reads"
        description="Esta lectura no existe."
        path={props.path}
        noindex
      />
      <main class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
        <h1 class="font-serif text-4xl font-light">No encontramos esta lectura</h1>
        <A href="/" class="text-acento">
          Volver al catálogo
        </A>
      </main>
    </>
  );
}

const cargarLecturaNube = query(async (obra: string) => {
  const ensayo = await ensayoPublicado(obra);
  if (ensayo) return { tipo: "ensayo" as const, ...ensayo };
  const muestra = await muestraLibroPublicado(obra);
  if (muestra) return { tipo: "muestra" as const, ...muestra };
  return null;
}, "lectura-nube");

/** Ensayo o muestra gratuita de libro publicado desde el panel (ADR 0021 y 0024). */
function EnsayoDelPanel(props: { obra: string }) {
  onMount(() => iniciarCuentaLector());
  const lectura = createAsync(() => cargarLecturaNube(props.obra));
  return (
    <Show
      when={lectura() !== undefined}
      fallback={
        <main
          class="flex min-h-dvh flex-col items-center justify-center bg-fondo-hondo px-6 text-center"
          aria-live="polite"
        >
          <p class="font-serif text-xl text-tinta-2">Abriendo la lectura…</p>
        </main>
      }
    >
      <Show when={lectura()} fallback={<NoEncontrada path={readHref(props.obra)} />}>
        {(e) => (
          <>
            <Seo
              title={`${e().pieza.title} · Huapango +reads`}
              description={
                e().tipo === "ensayo"
                  ? "Ensayo de acceso libre en Huapango +reads."
                  : "Muestra de lectura en Huapango +reads."
              }
              path={readHref(props.obra)}
              noindex={e().tipo === "muestra"}
            />
            <Reader
              pieza={e().pieza}
              assetUrl={(name) => e().imagenes[name] ?? ""}
              watermark={marcaDeAguaLectura(
                e().tipo === "ensayo"
                  ? "Huapango +reads · Ensayo de acceso libre"
                  : "Huapango +reads · Muestra de lectura",
              )}
              exitHref={e().tipo === "muestra" ? `/libro/${props.obra}` : "/"}
              notice={
                e().tipo === "ensayo"
                  ? "Ensayo · Editorial Huapango"
                  : "Muestra gratuita · Editorial Huapango"
              }
              onProgress={(r) => void sincronizarProgreso(props.obra, e().pieza.slug, r)}
            />
          </>
        )}
      </Show>
    </Show>
  );
}

/**
 * Lector de una obra: las importadas al sitio (con manifiesto) o, si no hay manifiesto, un ensayo
 * o muestra gratuita publicada desde el panel.
 */
export function ObraReader(props: { obra: string; slug?: string }) {
  return (
    <Show
      when={getManifest(props.obra) !== undefined}
      fallback={<EnsayoDelPanel obra={props.obra} />}
    >
      <ObraEstatica obra={props.obra} slug={props.slug} />
    </Show>
  );
}

function ObraEstatica(props: { obra: string; slug?: string }) {
  onMount(() => iniciarCuentaLector());
  const manifest = createMemo(() => getManifest(props.obra));
  const entry = createMemo(() => {
    const m = manifest();
    if (!m) return undefined;
    return props.slug === undefined ? mainEntry(m) : findEntry(m, props.slug);
  });

  const [pieza, setPieza] = createSignal<Pieza | null>(null);
  const [failure, setFailure] = createSignal<string | null>(null);

  // Se vuelve a ejecutar al cambiar de pieza (el componente se reutiliza al navegar entre piezas).
  createEffect(
    on(
      () => entry()?.slug,
      async (slug) => {
        setPieza(null);
        setFailure(null);
        if (slug === undefined) return;
        try {
          const loaded = await loadPieza(props.obra, slug);
          if (entry()?.slug === slug) setPieza(loaded);
        } catch (error) {
          setFailure(error instanceof Error ? error.message : "No se pudo cargar el texto.");
        }
      },
    ),
  );

  const exitHref = () => (getBookSync(props.obra) ? `/libro/${props.obra}` : "/");
  const mainSlug = () => {
    const m = manifest();
    return m ? mainEntry(m)?.slug : undefined;
  };
  const contents = (): ReaderContentItem[] =>
    (manifest()?.pieces ?? []).map((p) => ({
      slug: p.slug,
      title: p.title,
      credit: p.credit,
      minutes: p.stats.minutes,
      kind: p.kind,
      href: readHref(props.obra, p.slug === mainSlug() ? undefined : p.slug),
      current: p.slug === entry()?.slug,
    }));

  return (
    <Show
      when={entry()}
      fallback={
        <>
          <HttpStatusCode code={404} />
          <Seo
            title="Lectura no encontrada · Huapango +reads"
            description="Esta lectura no existe."
            path={`/leer/${props.obra}`}
            noindex
          />
          <main class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
            <h1 class="font-serif text-4xl font-light">No encontramos esta lectura</h1>
            <A href="/" class="text-acento">
              Volver al catálogo
            </A>
          </main>
        </>
      }
    >
      {(e) => (
        <>
          <Seo
            title={`${e().title} · Huapango +reads`}
            description="Lectura en Huapango +reads."
            path={readHref(props.obra, props.slug)}
            noindex
          />
          <Show
            when={pieza()}
            keyed
            fallback={
              <main
                class="flex min-h-dvh flex-col items-center justify-center gap-3 bg-fondo-hondo px-6 text-center"
                aria-live="polite"
              >
                <Show
                  when={failure()}
                  fallback={<p class="font-serif text-xl text-tinta-2">Abriendo «{e().title}»…</p>}
                >
                  {(message) => (
                    <>
                      <p class="font-serif text-xl text-tinta">No se pudo abrir la lectura</p>
                      <p class="text-sm text-tinta-suave">{message()}</p>
                      <A href={exitHref()} class="text-acento">
                        Volver
                      </A>
                    </>
                  )}
                </Show>
              </main>
            }
          >
            {(loaded) => (
              <Reader
                pieza={loaded}
                assetUrl={(name) => assetUrl(props.obra, name)}
                watermark={marcaDeAguaLectura("Ejemplar de muestra · Huapango +reads")}
                exitHref={exitHref()}
                notice="Edición digital · Editorial Huapango"
                contents={contents()}
                onProgress={(r) => void sincronizarProgreso(props.obra, loaded.slug, r)}
              />
            )}
          </Show>
        </>
      )}
    </Show>
  );
}
