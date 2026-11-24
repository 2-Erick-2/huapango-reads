import { For, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { BlockView } from "~/components/reader/Blocks";
import type { Pieza } from "~/lib/libro/types";
import { THEMES } from "~/lib/reader/types";

/**
 * Página media carta (5.5 × 8.5 in) a 96 ppp, con márgenes de 0.625 in. Es la medida que imprimen en
 * la editorial (se manda con "Folleto" de Acrobat; ver docs/analisis/2026-11-24-pdf-imprenta-*.md).
 */
const PAGE_W = 528;
const PAGE_H = 816;
const MARGIN_X = 60;
const MARGIN_Y = 64;
const INNER_W = PAGE_W - MARGIN_X * 2;
/** Espacio visible entre una hoja y la siguiente */
const SHEET_GAP = 24;
/** Separación entre columnas: los márgenes de dos hojas contiguas más el espacio entre ellas */
const COLUMN_GAP = MARGIN_X * 2 + SHEET_GAP;
const PITCH = PAGE_W + SHEET_GAP;

const ZOOMS = [0.5, 0.75, 1] as const;

/**
 * Vista previa de impresión: el texto compuesto en hojas media carta, todas visibles, con su número de
 * página. Es una vista aproximada (el PDF final lo compone el taller de impresión); sirve para ver
 * cuántas páginas salen, dónde cae cada título y si las imágenes caben.
 */
export function PrintPreview(props: { pieza: Pieza; assetUrl: (name: string) => string }) {
  let viewport!: HTMLDivElement;
  let flow!: HTMLDivElement;
  const theme = THEMES.bond;

  const [pages, setPages] = createSignal(1);
  const [fit, setFit] = createSignal(0.6);
  const [zoom, setZoom] = createSignal<number | "ajustar">("ajustar");

  const scale = createMemo(() => {
    const z = zoom();
    return z === "ajustar" ? fit() : z;
  });

  const measure = () => {
    let right = 0;
    for (const child of Array.from(flow.children)) {
      if (child instanceof HTMLElement)
        right = Math.max(right, child.offsetLeft + child.offsetWidth);
    }
    setPages(right <= MARGIN_X ? 1 : Math.floor((right - MARGIN_X - 1) / PITCH) + 1);
  };

  onMount(() => {
    const fitHeight = () =>
      setFit(Math.min(1, Math.max(0.3, (viewport.clientHeight - 48) / PAGE_H)));
    fitHeight();
    measure();
    const ro = new ResizeObserver(fitHeight);
    ro.observe(viewport);
    void document.fonts.ready.then(measure);
    // Las imágenes cambian la composición cuando terminan de cargar.
    flow.addEventListener("load", measure, true);
    onCleanup(() => {
      ro.disconnect();
      flow.removeEventListener("load", measure, true);
    });
  });

  const move = (dir: 1 | -1) =>
    viewport.scrollBy({ left: dir * PITCH * scale() * 2, behavior: "smooth" });

  const onWheel = (e: WheelEvent) => {
    // Con todas las hojas en una fila, la rueda vertical las recorre.
    if (
      viewport.scrollHeight <= viewport.clientHeight + 1 &&
      Math.abs(e.deltaY) > Math.abs(e.deltaX)
    )
      viewport.scrollLeft += e.deltaY;
  };

  const missing = () => (4 - (pages() % 4)) % 4;
  const totalW = () => pages() * PAGE_W + (pages() - 1) * SHEET_GAP;
  const button =
    "h-9 rounded-sm border border-linea-fuerte px-3 text-[13px] font-semibold text-tinta-2 hover:border-borde-hover";

  return (
    <div class="flex h-full min-h-0 flex-col bg-fondo-hondo">
      <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-linea bg-fondo px-4 py-3 sm:px-6">
        <p class="m-0 text-[13px] text-tinta-2" aria-live="polite" data-testid="paginas-impresion">
          <strong class="font-semibold text-tinta">{pages()}</strong>{" "}
          {pages() === 1 ? "página" : "páginas"} de texto en media carta
          <span class="text-tinta-tenue">
            {" · "}
            {missing() === 0
              ? "cuadra para armar el folleto"
              : `para el folleto faltan ${missing()} ${missing() === 1 ? "página" : "páginas"} (el total debe ser múltiplo de 4)`}
          </span>
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class={button}
            aria-label="Páginas anteriores"
            onClick={() => move(-1)}
          >
            ←
          </button>
          <button
            type="button"
            class={button}
            aria-label="Páginas siguientes"
            onClick={() => move(1)}
          >
            →
          </button>
          <span class="mx-1 h-6 w-px bg-control" aria-hidden="true" />
          <button
            type="button"
            class={button}
            aria-pressed={zoom() === "ajustar"}
            classList={{ "border-acento-borde text-tinta": zoom() === "ajustar" }}
            onClick={() => setZoom("ajustar")}
          >
            Ajustar
          </button>
          <For each={ZOOMS}>
            {(z) => (
              <button
                type="button"
                class={button}
                aria-pressed={zoom() === z}
                classList={{ "border-acento-borde text-tinta": zoom() === z }}
                onClick={() => setZoom(z)}
              >
                {Math.round(z * 100)} %
              </button>
            )}
          </For>
        </div>
      </div>

      <div
        ref={viewport}
        onWheel={onWheel}
        class="min-h-0 flex-1 overflow-auto px-6 py-6"
        tabindex="0"
        role="region"
        aria-label="Hojas de la vista previa de impresión"
      >
        <div
          class="mx-auto"
          style={{ width: `${totalW() * scale()}px`, height: `${PAGE_H * scale()}px` }}
        >
          <div
            class="relative"
            style={{
              width: `${totalW()}px`,
              height: `${PAGE_H}px`,
              transform: `scale(${scale()})`,
              "transform-origin": "0 0",
            }}
          >
            {/* Las hojas de papel, con su folio */}
            <For each={Array.from({ length: pages() }, (_, i) => i)}>
              {(i) => (
                <div
                  aria-hidden="true"
                  class="absolute top-0 shadow-hoja"
                  style={{
                    left: `${i * PITCH}px`,
                    width: `${PAGE_W}px`,
                    height: `${PAGE_H}px`,
                    background: theme.bg,
                  }}
                >
                  <span
                    class="absolute inset-x-0 text-center font-serif text-[12px]"
                    style={{ bottom: "26px", color: theme.muted }}
                  >
                    {i + 1}
                  </span>
                </div>
              )}
            </For>

            {/* El texto, compuesto en columnas del ancho de la mancha: cada columna es una hoja */}
            <div
              ref={flow}
              data-print-flow
              lang="es-MX"
              class="absolute left-0 top-0 font-serif"
              style={{
                width: `${PAGE_W}px`,
                height: `${PAGE_H}px`,
                "box-sizing": "border-box",
                padding: `${MARGIN_Y}px ${MARGIN_X}px`,
                "column-width": `${INNER_W}px`,
                "column-gap": `${COLUMN_GAP}px`,
                "column-fill": "auto",
                "font-size": "14px",
                "line-height": "1.5",
                color: theme.fg,
              }}
            >
              <For each={props.pieza.blocks}>
                {(block) => (
                  <BlockView
                    block={block}
                    theme={theme}
                    dark={false}
                    assetUrl={props.assetUrl}
                    maxImageHeight={420}
                  />
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
