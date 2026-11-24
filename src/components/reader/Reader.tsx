import { A } from "@solidjs/router";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import type { Pieza, PiezaKind } from "~/lib/libro/types";
import {
  clamp,
  columnOfOffset,
  computeLayout,
  countColumns,
  countSpreads,
  remapSpread,
  spreadOfColumn,
  type PageLayout,
} from "~/lib/reader/pagination";
import {
  loadPosition,
  minutesLeft,
  ratioOf,
  savePosition,
  spreadOfRatio,
} from "~/lib/reader/position";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "~/lib/reader/settings";
import {
  FONT_SIZE,
  FONTS,
  LEADING,
  THEMES,
  type ReaderFont,
  type ReaderLeading,
  type ReaderSettings,
  type ReaderTheme,
} from "~/lib/reader/types";
import { BotonTema } from "~/components/ui/BotonTema";
import { temaActual } from "~/lib/tema";
import { BlockView } from "./Blocks";
import { SettingsPanel } from "./SettingsPanel";

/** Margen interior de cada página en px; la separación del pliego es el doble (márgenes de ambas páginas). */
const PAGE_PADDING = 48;
const PAGE_PADDING_MOBILE = 24;

/** Una pieza de la misma obra, para el índice del lector. */
export interface ReaderContentItem {
  slug: string;
  title: string;
  credit: string | null;
  minutes: number;
  kind: PiezaKind;
  href: string;
  current: boolean;
}

export interface ReaderProps {
  pieza: Pieza;
  /** URL pública de un archivo de la pieza (imágenes) */
  assetUrl: (name: string) => string;
  /** Marca de agua visible: identifica al lector en cada página (en el demo, datos de muestra) */
  watermark: string;
  exitHref: string;
  /** Texto del pie, a la derecha del avance (p. ej. "Texto de demostración") */
  notice: string;
  /** Piezas de la obra para el índice. Con menos de 2 no se muestra el grupo. */
  contents?: ReaderContentItem[];
  /**
   * Vista previa dentro de otra pantalla (el panel de la editorial): ocupa el alto de su contenedor
   * en lugar de la ventana y no lee ni guarda la posición de lectura del dispositivo.
   */
  embedded?: boolean;
  /** Con `embedded`, qué hacer al pulsar la flecha de salida (en lugar de navegar a `exitHref`) */
  onExit?: () => void;
  /** Callback opcional cuando el lector avanza de página para sincronizar su progreso. */
  onProgress?: (ratio: number) => void;
}

function ExitIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/**
 * Motor de lectura (ADR 0005 y 0016): paginación por columnas CSS sobre bloques tipados.
 * - Escritorio: pliego de 2 páginas. Celular: 1 página.
 * - Navegación: zonas laterales, swipe, flechas del teclado y botones.
 * - Toque al centro: modo inmersivo (oculta la interfaz).
 * - Recuerda la posición por pieza y muestra el tiempo que falta (no el número de página, que
 *   cambia con el tamaño de letra).
 * - Protección: sin copiar ni imprimir, contenido oculto al cambiar de app y marca de agua.
 *   En web NO se pueden bloquear capturas de pantalla (ver la skill huapango-reads).
 */
export function Reader(props: ReaderProps) {
  let stage!: HTMLDivElement;
  let content!: HTMLDivElement;

  const [settings, setSettings] = createSignal<ReaderSettings>(DEFAULT_SETTINGS);
  const [layout, setLayout] = createSignal<PageLayout | null>(null);
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  const [spread, setSpread] = createSignal(0);
  const [spreads, setSpreads] = createSignal(1);
  const [sectionStarts, setSectionStarts] = createSignal<number[]>([]);
  const [immersive, setImmersive] = createSignal(false);
  const [hidden, setHidden] = createSignal(false);
  const [tocOpen, setTocOpen] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [ready, setReady] = createSignal(false);
  // Posición guardada de la visita anterior. Se aplica en cada medición hasta que la persona
  // pasa de página: así una primera medición parcial (fuentes o imágenes aún cargando) no la pierde.
  let pendingRatio: number | null = null;
  const [moved, setMoved] = createSignal(false);

  const theme = () => THEMES[settings().theme];
  const padding = () => (size().width >= 640 ? PAGE_PADDING : PAGE_PADDING_MOBILE);

  /** Secciones navegables: los títulos de nivel 1 y 2 de la pieza. */
  const sections = createMemo(() =>
    props.pieza.blocks.flatMap((b) => (b.type === "heading" && b.level < 3 ? [b] : [])),
  );
  const portadillaEnd = createMemo(() => {
    const blocks = props.pieza.blocks;
    if (blocks[0]?.type !== "image" || blocks[0].role !== "portadilla") return -1;
    const firstPara = blocks.findIndex((b) => b.type === "paragraph");
    return firstPara > 0 ? firstPara - 1 : -1;
  });
  const sectionTitle = (index: number) => {
    const block = sections()[index];
    return block?.text.map((t) => (typeof t === "string" ? t : "")).join("") ?? "";
  };

  /** Mide el contenido y recalcula páginas conservando la posición de lectura */
  const relayout = () => {
    const innerWidth = stage.clientWidth - padding() * 2;
    const innerHeight = stage.clientHeight - padding() * 2 - 28; // 28px reservados para la marca de agua
    if (innerWidth <= 0 || innerHeight <= 0) return;
    const next = computeLayout(innerWidth, padding() * 2);
    const previousTotal = spreads();
    setSize({ width: innerWidth, height: innerHeight });
    setLayout(next);
    // Esperar a que el navegador reacomode las columnas con las nuevas medidas
    requestAnimationFrame(() => {
      const total = countSpreads(countColumns(content.scrollWidth, next), next);
      setSpreads(total);
      if (!moved()) setSpread(pendingRatio === null ? 0 : spreadOfRatio(pendingRatio, total));
      else setSpread((s) => remapSpread(s, previousTotal, total));
      const starts = [...content.querySelectorAll<HTMLElement>("[data-section]")].map((el) =>
        spreadOfColumn(columnOfOffset(el.offsetLeft, next), next),
      );
      setSectionStarts(starts);
      setReady(true);
    });
  };

  const go = (delta: number) => {
    setMoved(true);
    setSpread((s) => clamp(s + delta, 0, spreads() - 1));
  };
  const goTo = (target: number) => {
    setMoved(true);
    setSpread(clamp(target, 0, spreads() - 1));
    setTocOpen(false);
  };

  const currentSection = createMemo(() => {
    let index = -1;
    sectionStarts().forEach((start, i) => {
      if (spread() >= start) index = i;
    });
    return index < 0 ? "" : sectionTitle(index);
  });

  const ratio = () => ratioOf(spread(), spreads());
  const progress = () => Math.round(ratio() * 100);
  const finished = () => spreads() > 1 && spread() >= spreads() - 1;
  const remaining = () =>
    finished()
      ? "Terminaste esta pieza"
      : `Quedan ≈ ${minutesLeft(props.pieza.stats.minutes, ratio())} min`;
  const pageLabel = () => {
    const l = layout();
    if (!l) return "";
    const first = spread() * l.columns + 1;
    return l.columns === 2 ? `Páginas ${first}–${first + 1}` : `Página ${first}`;
  };
  // El título de la propia pieza no se repite como subtítulo: se muestra el capítulo actual o la firma.
  const subtitle = () => {
    const section = currentSection();
    return (section !== "" && section !== props.pieza.title ? section : props.pieza.credit) ?? "";
  };

  // --- Interacción: toque, swipe, teclado ---
  let pointerStart: { x: number; y: number; t: number } | null = null;

  const onPointerDown = (e: PointerEvent) => {
    pointerStart = { x: e.clientX, y: e.clientY, t: Date.now() };
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!pointerStart) return;
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    const dt = Date.now() - pointerStart.t;
    pointerStart = null;
    if (tocOpen() || settingsOpen()) {
      setTocOpen(false);
      setSettingsOpen(false);
      return;
    }
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 700) {
      go(dx < 0 ? 1 : -1); // swipe
      return;
    }
    if (Math.hypot(dx, dy) > 12) return; // fue un arrastre, no un toque
    const rect = stage.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 0.3) go(-1);
    else if (x > 0.7) go(1);
    else setImmersive((v) => !v);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
    else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    else if (e.key === "Home") goTo(0);
    else if (e.key === "End") goTo(spreads() - 1);
    else if (e.key === "Escape") {
      if (settingsOpen()) setSettingsOpen(false);
      else if (tocOpen()) setTocOpen(false);
      else if (immersive()) setImmersive(false);
      else return;
    } else return;
    e.preventDefault();
  };

  const onVisibility = () => setHidden(document.visibilityState === "hidden");

  onMount(() => {
    setSettings(loadSettings(temaActual() === "noche" ? "carbon" : "bond"));
    pendingRatio = props.embedded ? null : loadPosition(props.pieza.slug);
    const ro = new ResizeObserver(() => relayout());
    ro.observe(stage);
    void document.fonts.ready.then(relayout);
    // Recalcular también al terminar de cargar (imágenes/estilos tardíos pueden mover medidas)
    window.addEventListener("load", relayout, { once: true });
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    onCleanup(() => {
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
    });
  });

  // Cambiar el tamaño de letra repagina; el tema solo cambia colores
  createEffect(
    on(
      () => [settings().fontSize, settings().font, settings().leading] as const,
      () => relayout(),
      { defer: true },
    ),
  );
  createEffect(on(settings, (s) => saveSettings(s), { defer: true }));
  // Recordar dónde va el lector, pero solo cuando la persona ya pasó de página: nunca se pisa la
  // posición guardada con la que resulta de una medición automática.
  createEffect(
    on(
      () => [spread(), spreads()] as const,
      ([s, total]) => {
        if (moved() && !props.embedded) {
          const siguiente = ratioOf(s, total);
          savePosition(props.pieza.slug, siguiente);
          props.onProgress?.(siguiente);
        }
      },
      { defer: true },
    ),
  );

  const setTheme = (t: ReaderTheme) => setSettings((s) => ({ ...s, theme: t }));
  const setFont = (font: ReaderFont) => setSettings((s) => ({ ...s, font }));
  const setLeading = (leading: ReaderLeading) => setSettings((s) => ({ ...s, leading }));
  const changeFont = (delta: number) =>
    setSettings((s) => ({
      ...s,
      fontSize: clamp(s.fontSize + delta, FONT_SIZE.min, FONT_SIZE.max),
    }));

  const iconButton =
    "flex h-11 w-11 items-center justify-center rounded-sm border border-linea-fuerte text-tinta-2 transition-colors hover:border-borde-hover disabled:opacity-30";
  const hasContents = () => (props.contents?.length ?? 0) > 1;

  return (
    <div
      class="flex flex-col bg-fondo-hondo text-tinta print:hidden"
      classList={{ "h-dvh": !props.embedded, "h-full": props.embedded }}
    >
      {/* Barra superior */}
      <Show when={!immersive()}>
        <header class="relative z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-linea bg-fondo px-3 sm:px-6">
          <div class="flex min-w-0 items-center gap-3">
            <Show
              when={props.onExit}
              fallback={
                <A href={props.exitHref} class={iconButton} aria-label="Salir del lector">
                  <ExitIcon />
                </A>
              }
            >
              {(exit) => (
                <button
                  type="button"
                  class={iconButton}
                  aria-label="Cerrar la vista previa"
                  onClick={() => exit()()}
                >
                  <ExitIcon />
                </button>
              )}
            </Show>
            <div class="flex min-w-0 flex-col">
              <span class="truncate font-serif text-[15px] font-semibold sm:text-[17px]">
                {props.pieza.title}
              </span>
              <span class="truncate text-xs text-tinta-suave">{subtitle()}</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 sm:gap-2">
            <BotonTema class="h-11 w-11 rounded-sm" />
            <div class="relative">
              <button
                type="button"
                class={iconButton}
                aria-label="Índice"
                aria-expanded={tocOpen()}
                onClick={() => {
                  setSettingsOpen(false);
                  setTocOpen((v) => !v);
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
              </button>
              <Show when={tocOpen()}>
                <nav
                  aria-label="Índice"
                  class="absolute right-0 top-12 z-30 max-h-[70vh] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-sm border border-linea-fuerte bg-superficie p-2 shadow-book"
                >
                  <Show when={hasContents()}>
                    <p class="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-tinta-tenue">
                      En este libro
                    </p>
                    <For each={props.contents}>
                      {(item) => (
                        <A
                          href={item.href}
                          aria-current={item.current ? "page" : undefined}
                          class="flex w-full flex-col items-start rounded-sm px-3 py-2.5 text-left no-underline hover:bg-superficie-2"
                          classList={{ "bg-superficie-2": item.current }}
                        >
                          <span class="font-serif text-base text-tinta">{item.title}</span>
                          <span class="text-xs text-tinta-suave">
                            {item.kind === "libro"
                              ? "El libro"
                              : item.kind === "ensayo"
                                ? "Ensayo"
                                : "Complemento"}
                            {item.credit ? ` · ${item.credit}` : ""} · {item.minutes} min
                          </span>
                        </A>
                      )}
                    </For>
                  </Show>
                  <Show when={sections().length > 1}>
                    <p class="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-tinta-tenue">
                      En esta pieza
                    </p>
                    <For each={sections()}>
                      {(_, i) => (
                        <button
                          type="button"
                          class="flex w-full items-start rounded-sm px-3 py-2.5 text-left hover:bg-superficie-2"
                          onClick={() => goTo(sectionStarts()[i()] ?? 0)}
                        >
                          <span class="font-serif text-base text-tinta">{sectionTitle(i())}</span>
                        </button>
                      )}
                    </For>
                  </Show>
                  <Show when={!hasContents() && sections().length <= 1}>
                    <p class="px-3 py-3 text-sm text-tinta-suave">Esta pieza no tiene secciones.</p>
                  </Show>
                </nav>
              </Show>
            </div>
            <div class="relative">
              <button
                type="button"
                class={`${iconButton} font-serif text-[19px] tracking-tight`}
                aria-label="Ajustes de lectura"
                aria-haspopup="dialog"
                aria-expanded={settingsOpen()}
                onClick={() => {
                  setTocOpen(false);
                  setSettingsOpen((v) => !v);
                }}
              >
                Aa
              </button>
              <Show when={settingsOpen()}>
                <SettingsPanel
                  settings={settings()}
                  onFontSize={changeFont}
                  onTheme={setTheme}
                  onFont={setFont}
                  onLeading={setLeading}
                />
              </Show>
            </div>
            <button
              type="button"
              class={`${iconButton} hidden sm:flex`}
              aria-label="Modo inmersivo"
              onClick={() => setImmersive(true)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
              </svg>
            </button>
          </div>
        </header>
      </Show>

      {/* Área de lectura */}
      <main class="relative flex min-h-0 flex-1 items-stretch justify-center gap-2 px-1 py-2 sm:px-4 sm:py-6">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={spread() === 0}
          aria-label="Página anterior"
          class="hidden w-14 shrink-0 items-center justify-center text-tinta-tenue hover:text-tinta disabled:opacity-20 md:flex"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div
          ref={stage}
          class="relative w-full max-w-[1100px] touch-pan-y select-none overflow-hidden rounded-sm shadow-hoja"
          style={{ background: theme().bg, color: theme().fg }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onCopy={(e) => e.preventDefault()}
          role="region"
          aria-roledescription="lector"
          aria-label={`${props.pieza.title}. ${pageLabel()} de ${spreads() * (layout()?.columns ?? 1)}`}
        >
          {/* Sombra del lomo en pliego */}
          <Show when={layout()?.columns === 2}>
            <div
              class="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-24 -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(0,0,0,.10) 45%, rgba(0,0,0,.16) 50%, rgba(0,0,0,.10) 55%, transparent)",
              }}
              aria-hidden="true"
            />
          </Show>

          <div
            class="absolute overflow-hidden"
            style={{ inset: `${padding()}px ${padding()}px ${padding() + 28}px` }}
          >
            <div
              ref={content}
              lang="es-MX"
              data-reader-content
              class="font-serif"
              classList={{ "opacity-0": !ready() }}
              style={{
                height: `${size().height}px`,
                width: `${size().width}px`,
                "column-width": `${layout()?.columnWidth ?? 600}px`,
                "column-gap": `${layout()?.gap ?? 96}px`,
                "column-fill": "auto",
                // Fondo opaco propio: los adornos con "mix-blend-mode" se mezclan contra el papel.
                background: theme().bg,
                "font-size": `${settings().fontSize}px`,
                "line-height": LEADING[settings().leading].value,
                "font-family": FONTS[settings().font].family,
                transform: `translateX(-${spread() * (layout()?.step ?? 0)}px)`,
                // Sin animación hasta que la persona pasa de página: al abrir no debe verse un deslizamiento.
                transition: moved() ? "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
              }}
            >
              <For each={props.pieza.blocks}>
                {(block, i) => (
                  <BlockView
                    block={block}
                    theme={theme()}
                    dark={settings().theme === "carbon"}
                    assetUrl={props.assetUrl}
                    maxImageHeight={Math.floor(size().height * 0.54)}
                    breakAfter={i() === portadillaEnd()}
                  />
                )}
              </For>
            </div>
          </div>

          {/* Marca de agua: una por página visible */}
          <div
            class="pointer-events-none absolute inset-x-0 bottom-0 flex"
            style={{ height: `${padding() + 28}px` }}
            aria-hidden="true"
          >
            <For each={Array.from({ length: layout()?.columns ?? 1 })}>
              {() => (
                <span
                  class="flex flex-1 items-center justify-center px-4 text-center font-sans text-[10px] tracking-[0.06em]"
                  style={{ color: theme().muted }}
                >
                  {props.watermark}
                </span>
              )}
            </For>
          </div>

          {/* Contenido oculto al cambiar de app o pestaña (dificulta herramientas de captura) */}
          <Show when={hidden()}>
            <div class="absolute inset-0 z-20 flex items-center justify-center bg-fondo text-sm text-tinta-suave">
              Contenido protegido · vuelve a la pestaña para seguir leyendo
            </div>
          </Show>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={spread() >= spreads() - 1}
          aria-label="Página siguiente"
          class="hidden w-14 shrink-0 items-center justify-center text-tinta-tenue hover:text-tinta disabled:opacity-20 md:flex"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <Show when={immersive()}>
          <button
            type="button"
            onClick={() => setImmersive(false)}
            class="absolute right-4 top-4 z-30 h-10 rounded-full border border-linea-fuerte bg-fondo/90 px-4 text-xs font-semibold text-tinta-2"
          >
            Salir de modo inmersivo
          </button>
        </Show>
      </main>

      {/* Progreso */}
      <Show when={!immersive()}>
        <footer class="flex shrink-0 flex-col gap-2.5 border-t border-linea bg-fondo px-4 pb-4 pt-3 sm:px-6">
          <div
            class="h-[3px] overflow-hidden rounded-sm bg-control"
            role="progressbar"
            aria-label="Progreso de lectura"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress()}
          >
            <div
              class="h-full bg-acento-vivo transition-[width] duration-300"
              style={{ width: `${progress()}%` }}
            />
          </div>
          <div class="flex justify-between gap-4 text-xs text-tinta-suave">
            <span class="shrink-0 whitespace-nowrap">{remaining()}</span>
            <span class="truncate">
              {progress()} % · {props.notice}
            </span>
          </div>
        </footer>
      </Show>
    </div>
  );
}
