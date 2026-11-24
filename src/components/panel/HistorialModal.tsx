import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import type { Pieza } from "~/lib/libro/types";
import { ErrorPanel, cargarVersion, listarVersiones, type VersionResumen } from "~/lib/panel/nube";

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );

/**
 * Historial de versiones inmutables de una pieza guardada en Supabase:
 * permite revisar cuándo y quién guardó cada corte y restaurar cualquiera como borrador en el editor.
 */
export function HistorialModal(props: {
  piezaId: string;
  titulo: string;
  numeroActual: number;
  onRestaurar: (pieza: Pieza, numero: number) => void;
  onClose: () => void;
}) {
  const [versiones, setVersiones] = createSignal<VersionResumen[] | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [cargandoId, setCargandoId] = createSignal<string | null>(null);
  let cerrarBtn!: HTMLButtonElement;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !cargandoId()) props.onClose();
  };

  onMount(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    cerrarBtn.focus();
    void listarVersiones(props.piezaId)
      .then(setVersiones)
      .catch((err) =>
        setError(err instanceof ErrorPanel ? err.message : "No se pudo cargar el historial."),
      );
    onCleanup(() => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    });
  });

  const restaurar = async (v: VersionResumen) => {
    if (cargandoId()) return;
    setCargandoId(v.id);
    setError(null);
    try {
      const doc = await cargarVersion(v.id);
      props.onRestaurar(doc, v.numero);
      props.onClose();
    } catch (err) {
      setError(err instanceof ErrorPanel ? err.message : "No se pudo abrir esa versión.");
      setCargandoId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-historial"
      class="fixed inset-0 z-50 flex items-center justify-center bg-fondo-hondo/80 p-4 backdrop-blur-xs"
      data-testid="modal-historial"
    >
      <div class="flex max-h-[88dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-sm border border-linea bg-fondo shadow-hoja">
        <div class="flex shrink-0 items-center justify-between gap-4 border-b border-linea bg-superficie px-5 py-4 sm:px-6">
          <div class="flex min-w-0 flex-col">
            <span class="text-[11px] font-bold uppercase tracking-[0.24em] text-acento">
              Historial de versiones
            </span>
            <h2 id="titulo-historial" class="m-0 truncate font-serif text-2xl font-normal">
              {props.titulo}
            </h2>
          </div>
          <button
            ref={cerrarBtn}
            type="button"
            disabled={cargandoId() !== null}
            onClick={() => props.onClose()}
            class="h-9 rounded-sm border border-linea-fuerte px-3.5 text-[13px] font-semibold text-tinta-2 hover:border-borde-hover disabled:opacity-40"
          >
            Cerrar
          </button>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          <p class="m-0 text-[13px] leading-relaxed text-tinta-suave">
            Cada guardado queda archivado sin borrarse. Al restaurar una versión anterior la cargas
            en el editor para revisarla y guardarla como una nueva versión.
          </p>

          <Show when={error()}>
            {(m) => (
              <p
                role="alert"
                class="m-0 rounded-sm border border-error px-4 py-3 text-sm text-acento"
              >
                {m()}
              </p>
            )}
          </Show>

          <Show
            when={versiones()}
            fallback={<p class="m-0 text-sm text-tinta-suave">Cargando versiones…</p>}
          >
            {(lista) => (
              <ul class="m-0 flex list-none flex-col divide-y divide-linea border-y border-linea p-0">
                <For each={lista()}>
                  {(v) => (
                    <li class="flex flex-wrap items-center justify-between gap-3 py-3.5">
                      <div class="flex min-w-0 flex-col gap-0.5">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="font-serif text-lg text-tinta">Versión {v.numero}</span>
                          <Show when={v.numero === props.numeroActual}>
                            <span class="rounded-full border border-acento-borde bg-acento-tenue px-2.5 py-0.5 text-[11px] font-semibold text-acento">
                              Actual
                            </span>
                          </Show>
                        </div>
                        <span class="text-xs text-tinta-suave">
                          {fecha(v.creado_en)}
                          {v.autor?.nombre ? ` · ${v.autor.nombre}` : ""}
                          {v.stats?.words !== undefined
                            ? ` · ${v.stats.words.toLocaleString("es-MX")} palabras`
                            : ""}
                          {v.nota ? ` · ${v.nota}` : ""}
                        </span>
                      </div>
                      <Show when={v.numero !== props.numeroActual}>
                        <button
                          type="button"
                          disabled={cargandoId() !== null}
                          onClick={() => void restaurar(v)}
                          class="h-9 rounded-sm border border-borde px-3.5 text-[13px] font-semibold text-tinta hover:border-borde-hover disabled:opacity-40"
                        >
                          {cargandoId() === v.id ? "Cargando…" : "Restaurar"}
                        </button>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            )}
          </Show>
        </div>
      </div>
    </div>
  );
}
