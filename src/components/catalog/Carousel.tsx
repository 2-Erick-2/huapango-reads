import { createSignal, onCleanup, onMount, type JSX } from "solid-js";

const AUTOPLAY_MS = 4000;
const TOUCH_RESUME_MS = 3000;

function Arrow(props: { dir: 1 | -1; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center rounded-sm border border-linea-fuerte text-tinta-2 transition-colors hover:border-borde-hover disabled:opacity-30"
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d={props.dir === -1 ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );
}

/**
 * Fila tipo Netflix: título, flechas accesibles y desplazamiento horizontal nativo (swipe en táctil,
 * rueda/trackpad en escritorio). Todas las filas del inicio usan este componente para que queden
 * alineadas entre sí. Sin librerías de carrusel.
 */
export function Carousel(props: {
  /** Id de la sección (también de su encabezado: `fila-<id>`) */
  id: string;
  title: string;
  /** Texto pequeño a la derecha del título (p. ej. "Colección") */
  meta?: string;
  /** Frase bajo el título */
  subtitle?: string;
  children: JSX.Element;
}) {
  let scroller!: HTMLDivElement;
  const [canPrev, setCanPrev] = createSignal(false);
  const [canNext, setCanNext] = createSignal(false);
  const [hovered, setHovered] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const [touched, setTouched] = createSignal(false);

  const update = () => {
    setCanPrev(scroller.scrollLeft > 4);
    setCanNext(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4);
  };
  const page = (dir: 1 | -1) =>
    scroller.scrollBy({ left: dir * scroller.clientWidth * 0.85, behavior: "smooth" });

  const advanceAuto = () => {
    if (hovered() || focused() || touched() || document.visibilityState === "hidden") return;
    if (scroller.scrollWidth <= scroller.clientWidth + 4) return;
    const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 8;
    if (atEnd) {
      scroller.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      const step = Math.min(340, Math.max(180, Math.round(scroller.clientWidth * 0.55)));
      scroller.scrollBy({ left: step, behavior: "smooth" });
    }
  };

  let touchResumeTimer: number | undefined;
  const pauseTouch = () => {
    if (touchResumeTimer !== undefined) window.clearTimeout(touchResumeTimer);
    setTouched(true);
  };
  const releaseTouch = () => {
    if (touchResumeTimer !== undefined) window.clearTimeout(touchResumeTimer);
    touchResumeTimer = window.setTimeout(() => setTouched(false), TOUCH_RESUME_MS);
  };

  onMount(() => {
    update();
    // Las portadas pueden terminar de cargar después o llegar piezas asíncronas desde Supabase.
    const ro = new ResizeObserver(update);
    ro.observe(scroller);
    const mo = new MutationObserver(update);
    mo.observe(scroller, { childList: true });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = reducedMotion ? undefined : window.setInterval(advanceAuto, AUTOPLAY_MS);

    onCleanup(() => {
      ro.disconnect();
      mo.disconnect();
      if (touchResumeTimer !== undefined) window.clearTimeout(touchResumeTimer);
      if (interval !== undefined) window.clearInterval(interval);
    });
  });

  const headingId = () => `fila-${props.id}`;

  return (
    <section
      aria-labelledby={headingId()}
      id={props.id}
      class="flex flex-col gap-5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusIn={() => setFocused(true)}
      onFocusOut={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onTouchStart={pauseTouch}
      onTouchEnd={releaseTouch}
      onTouchCancel={releaseTouch}
    >
      <div class="flex items-end justify-between gap-4 px-4 sm:px-10">
        <div class="flex min-w-0 flex-col gap-1.5">
          <h2
            id={headingId()}
            class="m-0 font-serif text-[22px] font-normal tracking-tight sm:text-[28px]"
          >
            {props.title}
          </h2>
          {props.subtitle ? (
            <p class="m-0 text-[13px] text-tinta-suave sm:text-sm">{props.subtitle}</p>
          ) : null}
        </div>
        <div class="flex shrink-0 items-center gap-4">
          {props.meta ? (
            <span class="hidden text-xs font-semibold uppercase tracking-[0.2em] text-tinta-tenue sm:inline">
              {props.meta}
            </span>
          ) : null}
          <div class="hidden gap-2 md:flex">
            <Arrow
              dir={-1}
              label={`Anteriores en ${props.title}`}
              disabled={!canPrev()}
              onClick={() => page(-1)}
            />
            <Arrow
              dir={1}
              label={`Siguientes en ${props.title}`}
              disabled={!canNext()}
              onClick={() => page(1)}
            />
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        onScroll={update}
        class="row-scroll flex gap-4 overflow-x-auto px-4 pb-3 pt-2 sm:gap-6 sm:px-10"
      >
        {props.children}
      </div>
    </section>
  );
}
