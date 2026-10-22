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
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "~/lib/reader/settings";
import {
  FONT_SIZE,
  THEMES,
  type ReadableText,
  type ReaderSettings,
  type ReaderTheme,
} from "~/lib/reader/types";

/** Margen interior de cada página en px; la separación del pliego es el doble (márgenes de ambas páginas). */
const PAGE_PADDING = 48;
const PAGE_PADDING_MOBILE = 24;

export interface ReaderProps {
  text: ReadableText;
  /** Marca de agua visible: identifica al lector en cada página (en el demo, datos de muestra) */
  watermark: string;
  exitHref: string;
}

/**
 * Motor de lectura v0 (ADR 0005): paginación por columnas CSS sobre contenido estructurado.
 * - Escritorio: pliego de 2 páginas. Celular: 1 página.
 * - Navegación: zonas laterales, swipe, flechas del teclado y botones.
 * - Toque al centro: modo inmersivo (oculta la interfaz).
 * - Protección del demo: sin copiar ni imprimir, contenido oculto al cambiar de app y marca de agua.
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
  const [chapterStarts, setChapterStarts] = createSignal<number[]>([]);
  const [immersive, setImmersive] = createSignal(false);
  const [hidden, setHidden] = createSignal(false);
  const [tocOpen, setTocOpen] = createSignal(false);
  const [ready, setReady] = createSignal(false);

  const theme = () => THEMES[settings().theme];
  const padding = () => (size().width >= 640 ? PAGE_PADDING : PAGE_PADDING_MOBILE);

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
      setSpread((s) => remapSpread(s, previousTotal, total));
      const starts = [...content.querySelectorAll<HTMLElement>("[data-chapter]")].map((el) =>
        spreadOfColumn(columnOfOffset(el.offsetLeft, next), next),
      );
      setChapterStarts(starts);
      setReady(true);
    });
  };

  const go = (delta: number) => setSpread((s) => clamp(s + delta, 0, spreads() - 1));
  const goTo = (target: number) => {
    setSpread(clamp(target, 0, spreads() - 1));
    setTocOpen(false);
  };

  const currentChapter = createMemo(() => {
    const starts = chapterStarts();
    let index = 0;
    starts.forEach((start, i) => {
      if (spread() >= start) index = i;
    });
    return props.text.chapters[index];
  });

  const progress = () => (spreads() <= 1 ? 100 : Math.round((spread() / (spreads() - 1)) * 100));
  const pageLabel = () => {
    const l = layout();
    if (!l) return "";
    const first = spread() * l.columns + 1;
    return l.columns === 2 ? `Páginas ${first}–${first + 1}` : `Página ${first}`;
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
    if (tocOpen()) {
      setTocOpen(false);
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
      if (tocOpen()) setTocOpen(false);
      else if (immersive()) setImmersive(false);
      else return;
    } else return;
    e.preventDefault();
  };

  const onVisibility = () => setHidden(document.visibilityState === "hidden");

  onMount(() => {
    setSettings(loadSettings());
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
      () => settings().fontSize,
      () => relayout(),
      { defer: true },
    ),
  );
  createEffect(on(settings, (s) => saveSettings(s), { defer: true }));

  const setTheme = (t: ReaderTheme) => setSettings((s) => ({ ...s, theme: t }));
  const changeFont = (delta: number) =>
    setSettings((s) => ({
      ...s,
      fontSize: clamp(s.fontSize + delta, FONT_SIZE.min, FONT_SIZE.max),
    }));

  const iconButton =
    "flex h-11 w-11 items-center justify-center rounded-sm border border-carbon-700 text-bond-300 transition-colors hover:border-carbon-400 disabled:opacity-30";

  return (
    <div class="flex h-dvh flex-col bg-carbon-950 text-bond-100 print:hidden">
      {/* Barra superior */}
      <Show when={!immersive()}>
        <header class="relative z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-carbon-800 bg-carbon-900 px-3 sm:px-6">
          <div class="flex min-w-0 items-center gap-3">
            <A href={props.exitHref} class={iconButton} aria-label="Salir del lector">
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
            </A>
            <div class="flex min-w-0 flex-col">
              <span class="truncate font-serif text-[15px] font-semibold sm:text-[17px]">
                {props.text.title}
              </span>
              <span class="truncate text-xs text-carbon-300">
                {currentChapter()?.label} · {currentChapter()?.title}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 sm:gap-2">
            <div class="relative">
              <button
                type="button"
                class={iconButton}
                aria-label="Índice"
                aria-expanded={tocOpen()}
                onClick={() => setTocOpen((v) => !v)}
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
                  class="absolute right-0 top-12 z-30 w-72 rounded-sm border border-carbon-700 bg-carbon-850 p-2 shadow-book"
                >
                  <For each={props.text.chapters}>
                    {(ch, i) => (
                      <button
                        type="button"
                        class="flex w-full flex-col items-start rounded-sm px-3 py-2.5 text-left hover:bg-carbon-800"
                        onClick={() => goTo(chapterStarts()[i()] ?? 0)}
                      >
                        <span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-terregal-400">
                          {ch.label}
                        </span>
                        <span class="font-serif text-base text-bond-100">{ch.title}</span>
                      </button>
                    )}
                  </For>
                </nav>
              </Show>
            </div>
            <button
              type="button"
              class={`${iconButton} text-[13px]`}
              aria-label="A− Reducir tamaño de letra"
              disabled={settings().fontSize <= FONT_SIZE.min}
              onClick={() => changeFont(-1)}
            >
              A−
            </button>
            <button
              type="button"
              class={`${iconButton} text-[17px]`}
              aria-label="A+ Aumentar tamaño de letra"
              disabled={settings().fontSize >= FONT_SIZE.max}
              onClick={() => changeFont(1)}
            >
              A+
            </button>
            <div role="radiogroup" aria-label="Tema de lectura" class="hidden gap-1.5 px-1 sm:flex">
              <For
                each={Object.entries(THEMES) as Array<[ReaderTheme, (typeof THEMES)[ReaderTheme]]>}
              >
                {([key, t]) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={settings().theme === key}
                    aria-label={`Tema ${t.name}`}
                    onClick={() => setTheme(key)}
                    class="h-7 w-7 rounded-full border-2"
                    style={{
                      background: t.bg,
                      "border-color": settings().theme === key ? "#D66E53" : "#3A3935",
                    }}
                  />
                )}
              </For>
            </div>
            <button
              type="button"
              class={`${iconButton} sm:hidden`}
              aria-label="Cambiar tema"
              onClick={() => {
                const keys = Object.keys(THEMES) as ReaderTheme[];
                setTheme(keys[(keys.indexOf(settings().theme) + 1) % keys.length] ?? "bond");
              }}
            >
              <span
                class="h-5 w-5 rounded-full border border-carbon-400"
                style={{ background: theme().bg }}
              />
            </button>
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
          class="hidden w-14 shrink-0 items-center justify-center text-carbon-400 hover:text-bond-100 disabled:opacity-20 md:flex"
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
          class="relative w-full max-w-[1100px] touch-pan-y select-none overflow-hidden rounded-sm shadow-[0_30px_60px_-20px_rgba(0,0,0,.8)]"
          style={{ background: theme().bg, color: theme().fg }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onCopy={(e) => e.preventDefault()}
          role="region"
          aria-roledescription="lector"
          aria-label={`${props.text.title}. ${pageLabel()} de ${spreads() * (layout()?.columns ?? 1)}`}
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
              class="font-serif"
              classList={{ "opacity-0": !ready() }}
              style={{
                height: `${size().height}px`,
                width: `${size().width}px`,
                "column-width": `${layout()?.columnWidth ?? 600}px`,
                "column-gap": `${layout()?.gap ?? 96}px`,
                "column-fill": "auto",
                "font-size": `${settings().fontSize}px`,
                "line-height": "1.7",
                transform: `translateX(-${spread() * (layout()?.step ?? 0)}px)`,
                transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <For each={props.text.chapters}>
                {(ch, i) => (
                  <section
                    data-chapter={ch.id}
                    style={{ "break-before": i() === 0 ? "auto" : "column" }}
                  >
                    <header
                      class="mb-[1.6em] pt-[2.5em] text-center"
                      style={{ "break-after": "avoid" }}
                    >
                      <p
                        class="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.3em]"
                        style={{ color: theme().accent }}
                      >
                        {ch.label}
                      </p>
                      <h2 class="m-0 mt-2 text-[1.75em] font-light leading-tight">{ch.title}</h2>
                    </header>
                    <For each={ch.paragraphs}>
                      {(p, j) => (
                        <p
                          class="m-0 text-justify"
                          style={{
                            "text-indent": j() === 0 ? "0" : "1.5em",
                            hyphens: "auto",
                            orphans: 2,
                            widows: 2,
                          }}
                        >
                          {p}
                        </p>
                      )}
                    </For>
                  </section>
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
            <div class="absolute inset-0 z-20 flex items-center justify-center bg-carbon-900 text-sm text-carbon-300">
              Contenido protegido · vuelve a la pestaña para seguir leyendo
            </div>
          </Show>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={spread() >= spreads() - 1}
          aria-label="Página siguiente"
          class="hidden w-14 shrink-0 items-center justify-center text-carbon-400 hover:text-bond-100 disabled:opacity-20 md:flex"
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
            class="absolute right-4 top-4 z-30 h-10 rounded-full border border-carbon-700 bg-carbon-900/90 px-4 text-xs font-semibold text-bond-300"
          >
            Salir de modo inmersivo
          </button>
        </Show>
      </main>

      {/* Progreso */}
      <Show when={!immersive()}>
        <footer class="flex shrink-0 flex-col gap-2.5 border-t border-carbon-800 bg-carbon-900 px-4 pb-4 pt-3 sm:px-6">
          <div
            class="h-[3px] overflow-hidden rounded-sm bg-carbon-700"
            role="progressbar"
            aria-label="Progreso de lectura"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress()}
          >
            <div
              class="h-full bg-terregal-500 transition-[width] duration-300"
              style={{ width: `${progress()}%` }}
            />
          </div>
          <div class="flex justify-between gap-4 text-xs text-carbon-300">
            <span class="shrink-0 whitespace-nowrap">
              {pageLabel()} de {spreads() * (layout()?.columns ?? 1)}
            </span>
            <span class="truncate">
              {progress()} % · {props.text.notice}
            </span>
          </div>
        </footer>
      </Show>
    </div>
  );
}
