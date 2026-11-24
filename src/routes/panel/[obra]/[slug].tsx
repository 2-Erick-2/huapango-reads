import { A, useParams } from "@solidjs/router";
import { Show, createEffect, createSignal, on } from "solid-js";
import { PanelShell } from "~/components/panel/PanelShell";
import { PieceEditor } from "~/components/panel/PieceEditor";
import { assetUrl, findEntry, getManifest, loadPieza } from "~/lib/contenido";
import type { Pieza } from "~/lib/libro/types";
import { ErrorPanel, abrirPieza, urlsDeImagenes } from "~/lib/panel/nube";

interface Abierta {
  pieza: Pieza;
  assetUrl: (name: string) => string;
  nube?: { obraId: string; piezaId: string; numero: number };
  obraTitulo: string;
}

/** Carga la pieza (de la base de la editorial o de la demostración) y abre el editor. */
function Editor(props: { obra: string; slug: string }) {
  const [abierta, setAbierta] = createSignal<Abierta | null>(null);
  const [missing, setMissing] = createSignal(false);
  const [failure, setFailure] = createSignal<string | null>(null);

  createEffect(
    on(
      () => [props.obra, props.slug] as const,
      async ([o, s]) => {
        setAbierta(null);
        setFailure(null);
        setMissing(false);
        try {
          const manifest = getManifest(o);
          if (manifest) {
            const entry = findEntry(manifest, s);
            if (!entry) return setMissing(true);
            const pieza = await loadPieza(o, s);
            setAbierta({ pieza, assetUrl: (n) => assetUrl(o, n), obraTitulo: o });
            return;
          }
          const nube = await abrirPieza(s);
          if (!nube || nube.obra.slug !== o) return setMissing(true);
          const nombres = nube.pieza.blocks.flatMap((b) => (b.type === "image" ? [b.asset] : []));
          const urls = await urlsDeImagenes(o, nombres);
          setAbierta({
            pieza: nube.pieza,
            assetUrl: (n) => urls[n] ?? "",
            nube: { obraId: nube.obra.id, piezaId: nube.id, numero: nube.numero },
            obraTitulo: nube.obra.titulo,
          });
        } catch (error) {
          setFailure(
            error instanceof ErrorPanel || error instanceof Error
              ? error.message
              : "No se pudo cargar la pieza.",
          );
        }
      },
    ),
  );

  return (
    <Show
      when={!missing()}
      fallback={
        <main class="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-6 py-20 text-center">
          <h1 class="font-serif text-3xl font-light">No existe esa pieza</h1>
          <A href="/panel" class="text-acento">
            Volver a la biblioteca
          </A>
        </main>
      }
    >
      <Show
        when={abierta()}
        keyed
        fallback={
          <main
            class="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-6 py-20 text-center"
            aria-live="polite"
          >
            <Show
              when={failure()}
              fallback={<p class="font-serif text-xl text-tinta-2">Abriendo el editor…</p>}
            >
              {(message) => <p class="text-sm text-acento">{message()}</p>}
            </Show>
          </main>
        }
      >
        {(a) => (
          <PieceEditor obra={props.obra} pieza={a.pieza} assetUrl={a.assetUrl} nube={a.nube} />
        )}
      </Show>
    </Show>
  );
}

/** Editor de una pieza: /panel/<obra>/<pieza>. */
export default function EditorPage() {
  const params = useParams();
  return (
    <PanelShell title="Editor" path={`/panel/${params.obra ?? ""}/${params.slug ?? ""}`}>
      <Editor obra={params.obra ?? ""} slug={params.slug ?? ""} />
    </PanelShell>
  );
}
