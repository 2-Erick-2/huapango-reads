import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { Reader } from "~/components/reader/Reader";
import type { Pieza } from "~/lib/libro/types";
import { PrintPreview } from "./PrintPreview";

type Modo = "lectura" | "impresion";

/**
 * Vista previa a pantalla completa de una pieza, en sus dos salidas:
 * - Lectura: el lector real de +reads (pliego, ajustes de tipografía y tema) con el texto en edición.
 * - Impresión: las hojas media carta con su número de página.
 */
export function PreviewModal(props: {
  pieza: Pieza;
  assetUrl: (name: string) => string;
  onClose: () => void;
}) {
  const [modo, setModo] = createSignal<Modo>("lectura");
  let closeButton!: HTMLButtonElement;

  const onKeyDown = (e: KeyboardEvent) => {
    // El lector usa Escape para cerrar sus propios paneles y avisa con defaultPrevented.
    if (e.key === "Escape" && !e.defaultPrevented) props.onClose();
  };

  onMount(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButton.focus();
    onCleanup(() => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    });
  });

  const tab = "h-9 rounded-sm border px-4 text-[13px] font-semibold transition-colors";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${props.pieza.title}`}
      class="fixed inset-0 z-50 flex flex-col bg-fondo-hondo"
      data-testid="vista-previa"
    >
      <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-linea bg-fondo px-4 py-3 sm:px-6">
        <div class="flex min-w-0 flex-col">
          <span class="text-[11px] font-bold uppercase tracking-[0.24em] text-acento">
            Vista previa
          </span>
          <span class="truncate font-serif text-lg">{props.pieza.title}</span>
        </div>
        <div role="tablist" aria-label="Salida" class="flex gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={modo() === "lectura"}
            class={tab}
            classList={{
              "border-acento-borde bg-acento-fondo/20 text-tinta": modo() === "lectura",
              "border-linea-fuerte text-tinta-2 hover:border-borde-hover": modo() !== "lectura",
            }}
            onClick={() => setModo("lectura")}
          >
            Lectura (+reads)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo() === "impresion"}
            class={tab}
            classList={{
              "border-acento-borde bg-acento-fondo/20 text-tinta": modo() === "impresion",
              "border-linea-fuerte text-tinta-2 hover:border-borde-hover": modo() !== "impresion",
            }}
            onClick={() => setModo("impresion")}
          >
            Impresión (media carta)
          </button>
        </div>
        <button
          ref={closeButton}
          type="button"
          onClick={() => props.onClose()}
          class="h-9 rounded-sm border border-linea-fuerte px-4 text-[13px] font-semibold text-tinta-2 hover:border-borde-hover"
        >
          Cerrar · Esc
        </button>
      </div>

      <div class="min-h-0 flex-1">
        <Show
          when={modo() === "lectura"}
          fallback={<PrintPreview pieza={props.pieza} assetUrl={props.assetUrl} />}
        >
          <Reader
            pieza={props.pieza}
            assetUrl={props.assetUrl}
            watermark="Vista previa de la editorial · no es un ejemplar de lector"
            exitHref="/panel"
            notice="Vista previa"
            embedded
            onExit={props.onClose}
          />
        </Show>
      </div>
    </div>
  );
}
