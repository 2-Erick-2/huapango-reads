import { Show, createSignal, onCleanup, onMount, type JSX } from "solid-js";

/** Cada cuánto avanza solo (desde que termina el movimiento anterior) */
const AUTOPLAY_MS = 4500;
/** Duración de un avance de una tarjeta: lento y suave, como una página que se desliza */
const PASO_MS = 1100;
/** Duración del regreso al inicio cuando llega al final */
const REGRESO_MS = 1600;
/** Tras tocar la fila en el celular, espera esto antes de volver a moverse */
const TOUCH_RESUME_MS = 6000;

/** Aceleración y frenado suaves (ease-in-out cúbico) */
const suave = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** Desfase estable por fila (0–2.7 s) para que no se muevan todas a la vez */
const desfase = (id: string) =>
  ([...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % 4) * 900;

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
  /** Pausa elegida con el botón (accesibilidad: WCAG 2.2.2) */
  const [pausado, setPausado] = createSignal(false);
  const [conMovimiento, setConMovimiento] = createSignal(false);
  let animacion = 0;
  let animando = false;

  const update = () => {
    setCanPrev(scroller.scrollLeft > 4);
    setCanNext(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4);
  };
  const page = (dir: 1 | -1) => {
    detener();
    scroller.scrollBy({ left: dir * scroller.clientWidth * 0.85, behavior: "smooth" });
  };

  /** Detiene un movimiento automático en curso y devuelve el "imán" de las tarjetas. */
  const detener = () => {
    if (!animando) return;
    cancelAnimationFrame(animacion);
    animando = false;
    scroller.style.scrollSnapType = "";
  };

  /**
   * Desliza hasta `destino` con aceleración suave. Durante el movimiento se apaga el "imán" de las
   * tarjetas (scroll-snap): si no, el navegador las jala al final y se ve un salto.
   */
  const deslizarA = (destino: number, duracion: number) => {
    detener();
    const inicio = scroller.scrollLeft;
    const distancia = destino - inicio;
    if (Math.abs(distancia) < 1) return;
    const t0 = performance.now();
    animando = true;
    scroller.style.scrollSnapType = "none";
    const cuadro = (t: number) => {
      const k = Math.min(1, (t - t0) / duracion);
      scroller.scrollLeft = inicio + distancia * suave(k);
      if (k < 1) animacion = requestAnimationFrame(cuadro);
      else {
        animando = false;
        scroller.style.scrollSnapType = "";
      }
    };
    animacion = requestAnimationFrame(cuadro);
  };

  /** Posición exacta de la siguiente tarjeta (respetando el margen de la fila), o null al final. */
  const siguienteTarjeta = (): number | null => {
    const margen = parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
    const maximo = scroller.scrollWidth - scroller.clientWidth;
    const actual = scroller.scrollLeft;
    for (const hijo of Array.from(scroller.children)) {
      if (!(hijo instanceof HTMLElement)) continue;
      const x = hijo.offsetLeft - margen;
      if (x > actual + 4) return Math.min(x, maximo);
    }
    return null;
  };

  const advanceAuto = () => {
    if (pausado() || hovered() || focused() || touched() || animando) return;
    if (document.visibilityState === "hidden") return;
    if (scroller.scrollWidth <= scroller.clientWidth + 4) return;
    const alFinal = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 8;
    const destino = alFinal ? null : siguienteTarjeta();
    if (destino === null) deslizarA(0, REGRESO_MS);
    else deslizarA(destino, PASO_MS);
  };

  let touchResumeTimer: number | undefined;
  const pauseTouch = () => {
    if (touchResumeTimer !== undefined) window.clearTimeout(touchResumeTimer);
    detener(); // la persona manda: si toca, el movimiento automático se suelta al instante
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
    setConMovimiento(!reducedMotion);
    let interval: number | undefined;
    const arranque = reducedMotion
      ? undefined
      : window.setTimeout(() => {
          interval = window.setInterval(advanceAuto, AUTOPLAY_MS);
        }, desfase(props.id));
    // Rueda o arrastre con el mouse: la persona manda, se suelta el movimiento automático.
    const soltar = () => detener();
    scroller.addEventListener("wheel", soltar, { passive: true });
    scroller.addEventListener("pointerdown", soltar, { passive: true });

    onCleanup(() => {
      ro.disconnect();
      mo.disconnect();
      detener();
      scroller.removeEventListener("wheel", soltar);
      scroller.removeEventListener("pointerdown", soltar);
      if (touchResumeTimer !== undefined) window.clearTimeout(touchResumeTimer);
      if (arranque !== undefined) window.clearTimeout(arranque);
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
          <Show when={conMovimiento() && (canNext() || canPrev())}>
            <button
              type="button"
              onClick={() => {
                if (!pausado()) detener();
                setPausado((v) => !v);
              }}
              aria-pressed={pausado()}
              aria-label={
                pausado()
                  ? `Reanudar el movimiento automático de ${props.title}`
                  : `Pausar el movimiento automático de ${props.title}`
              }
              title={pausado() ? "Reanudar movimiento" : "Pausar movimiento"}
              class="flex h-9 w-9 items-center justify-center rounded-full border border-linea-fuerte text-tinta-2 transition-colors hover:border-borde-hover md:h-10 md:w-10 md:rounded-sm"
            >
              <Show
                when={pausado()}
                fallback={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                }
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                </svg>
              </Show>
            </button>
          </Show>
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
        class="row-scroll relative flex gap-4 overflow-x-auto px-4 pb-3 pt-2 sm:gap-6 sm:px-10"
      >
        {props.children}
      </div>
    </section>
  );
}
