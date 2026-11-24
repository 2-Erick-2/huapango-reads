import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { ErrorPanel, tokenDeSesion } from "~/lib/panel/nube";

export interface ObraParaImprimir {
  slug: string;
  origen: "nube" | "demo";
  titulo: string;
  autor: string;
  coleccion: string | null;
  creditos: ReadonlyArray<{ rol: string; nombre: string }>;
}

interface AvisoImagen {
  pieza: string;
  imagen: string;
  ppp: number;
}

interface ResultadoPdf {
  nombreArchivo: string;
  pdfBase64: string;
  paginas: number;
  hojas: number | null;
  caras: number | null;
  avisos: AvisoImagen[];
  faltantes: string[];
  advertencias: string[];
  guardadoEnNube: boolean;
}

function proponerLegal(obra: ObraParaImprimir): string {
  const anio = new Date().getFullYear();
  return [
    obra.titulo,
    obra.autor,
    "",
    ...obra.creditos.map((c) => `${c.rol}: ${c.nombre}`),
    ...(obra.creditos.length > 0 ? [""] : []),
    ...(obra.coleccion ? [`Colección ${obra.coleccion}`] : []),
    `© ${anio} Editorial Huapango`,
    "",
    "ISBN: ",
  ].join("\n");
}

function descargarBase64(nombre: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Modal para preparar y descargar el PDF de imprenta de una obra completa (ADR 0023):
 * - Media carta (5.5 × 8.5 in), compatible con la opción Folleto de Adobe Acrobat.
 * - Folleto listo en hojas carta (11 × 8.5 in), ya acomodado para doblar y engrapar.
 */
export function ImprimirModal(props: { obra: ObraParaImprimir; onClose: () => void }) {
  const [titulo, setTitulo] = createSignal(props.obra.titulo);
  const [autor, setAutor] = createSignal(props.obra.autor);
  const [formato, setFormato] = createSignal<"media-carta" | "folleto">("media-carta");
  const [margenes, setMargenes] = createSignal<"clasico" | "compacto">("clasico");
  const [desplazamiento, setDesplazamiento] = createSignal("0");
  const [multiploDe4, setMultiploDe4] = createSignal(true);
  const [guiones, setGuiones] = createSignal(false);
  const [legal, setLegal] = createSignal(proponerLegal(props.obra));
  const [colofon, setColofon] = createSignal("Impreso en Editorial Huapango.");
  const [ocupado, setOcupado] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [resultado, setResultado] = createSignal<ResultadoPdf | null>(null);
  let cerrarBtn!: HTMLButtonElement;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !ocupado()) props.onClose();
  };

  onMount(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    cerrarBtn.focus();
    onCleanup(() => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", onKeyDown);
    });
  });

  const generar = async (e: SubmitEvent) => {
    e.preventDefault();
    if (ocupado()) return;
    if (!titulo().trim()) return setError("Escribe el título que irá en la portada y cornisas.");
    setOcupado(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/panel/imprimir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await tokenDeSesion()}`,
        },
        body: JSON.stringify({
          obraSlug: props.obra.slug,
          origen: props.obra.origen,
          titulo: titulo().trim(),
          autor: autor().trim(),
          legal: legal(),
          colofon: colofon(),
          guiones: guiones(),
          multiploDe4: multiploDe4(),
          margenes: margenes(),
          formato: formato(),
          desplazamientoMm: Number(desplazamiento()) || 0,
          guardarEnNube: props.obra.origen === "nube",
        }),
      });
      const cuerpo = (await res.json().catch(() => ({}))) as Partial<ResultadoPdf> & {
        error?: string;
      };
      if (!res.ok || !cuerpo.pdfBase64 || !cuerpo.nombreArchivo) {
        throw new ErrorPanel(cuerpo.error ?? "No se pudo preparar el PDF. Inténtalo de nuevo.");
      }
      const listo = cuerpo as ResultadoPdf;
      setResultado(listo);
      descargarBase64(listo.nombreArchivo, listo.pdfBase64);
    } catch (err) {
      setError(
        err instanceof ErrorPanel ? err.message : "No se pudo preparar el PDF. Inténtalo de nuevo.",
      );
    } finally {
      setOcupado(false);
    }
  };

  const campo =
    "w-full rounded-sm border border-linea-fuerte bg-superficie px-3 py-2 text-sm text-tinta placeholder:text-tinta-tenue focus:border-acento-borde focus:outline-none";
  const etiqueta = "text-[13px] font-semibold text-tinta-2";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-imprimir"
      class="fixed inset-0 z-50 flex items-center justify-center bg-fondo-hondo/80 p-4 backdrop-blur-xs"
      data-testid="modal-imprimir"
    >
      <div class="flex max-h-[92dvh] w-full max-w-[740px] flex-col overflow-hidden rounded-sm border border-linea bg-fondo shadow-hoja">
        <div class="flex shrink-0 items-center justify-between gap-4 border-b border-linea bg-superficie px-5 py-4 sm:px-6">
          <div class="flex min-w-0 flex-col">
            <span class="text-[11px] font-bold uppercase tracking-[0.24em] text-acento">
              Imprenta
            </span>
            <h2 id="titulo-imprimir" class="m-0 truncate font-serif text-2xl font-normal">
              Exportar para imprimir · {props.obra.titulo}
            </h2>
          </div>
          <button
            ref={cerrarBtn}
            type="button"
            disabled={ocupado()}
            onClick={() => props.onClose()}
            class="h-9 shrink-0 rounded-sm border border-linea-fuerte px-3.5 text-[13px] font-semibold text-tinta-2 hover:border-borde-hover disabled:opacity-40"
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={(e) => void generar(e)}
          class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-6"
        >
          <p class="m-0 text-[13px] leading-relaxed text-tinta-suave">
            Arma el libro completo con sus piezas en orden, medidas de media carta (5.5 × 8.5 in),
            fuentes libres incrustadas y tinta negra pura para imprimir.
          </p>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-1.5">
              <span class={etiqueta}>Título en portada y cornisas</span>
              <input
                class={campo}
                value={titulo()}
                onInput={(e) => setTitulo(e.currentTarget.value)}
                autocomplete="off"
              />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class={etiqueta}>Autoría en cornisas</span>
              <input
                class={campo}
                value={autor()}
                onInput={(e) => setAutor(e.currentTarget.value)}
                autocomplete="off"
              />
            </label>
          </div>

          <fieldset class="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend class={`${etiqueta} mb-2 p-0`}>Formato del archivo</legend>
            <div class="grid gap-3 sm:grid-cols-2">
              <label
                class="flex cursor-pointer flex-col gap-1 rounded-sm border p-3.5 transition-colors"
                classList={{
                  "border-acento-borde bg-acento-tenue": formato() === "media-carta",
                  "border-linea-fuerte hover:border-borde-hover": formato() !== "media-carta",
                }}
              >
                <span class="flex items-center gap-2 text-sm font-semibold text-tinta">
                  <input
                    type="radio"
                    name="formato"
                    value="media-carta"
                    checked={formato() === "media-carta"}
                    onChange={() => setFormato("media-carta")}
                    class="accent-acento-borde"
                  />
                  Media carta (5.5 × 8.5 in)
                </span>
                <span class="text-xs leading-snug text-tinta-suave">
                  Para mandar a imprimir con la opción «Folleto» de Adobe Acrobat.
                </span>
              </label>

              <label
                class="flex cursor-pointer flex-col gap-1 rounded-sm border p-3.5 transition-colors"
                classList={{
                  "border-acento-borde bg-acento-tenue": formato() === "folleto",
                  "border-linea-fuerte hover:border-borde-hover": formato() !== "folleto",
                }}
              >
                <span class="flex items-center gap-2 text-sm font-semibold text-tinta">
                  <input
                    type="radio"
                    name="formato"
                    value="folleto"
                    checked={formato() === "folleto"}
                    onChange={() => setFormato("folleto")}
                    class="accent-acento-borde"
                  />
                  Folleto listo en hojas carta
                </span>
                <span class="text-xs leading-snug text-tinta-suave">
                  Dos páginas por cara para imprimir a doble cara, doblar y engrapar sin Acrobat.
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset class="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend class={`${etiqueta} mb-2 p-0`}>Márgenes de página</legend>
            <div class="grid gap-3 sm:grid-cols-2">
              <label
                class="flex cursor-pointer flex-col gap-1 rounded-sm border p-3.5 transition-colors"
                classList={{
                  "border-acento-borde bg-acento-tenue": margenes() === "clasico",
                  "border-linea-fuerte hover:border-borde-hover": margenes() !== "clasico",
                }}
              >
                <span class="flex items-center gap-2 text-sm font-semibold text-tinta">
                  <input
                    type="radio"
                    name="margenes"
                    value="clasico"
                    checked={margenes() === "clasico"}
                    onChange={() => setMargenes("clasico")}
                    class="accent-acento-borde"
                  />
                  Clásico Huapango
                </span>
                <span class="text-xs leading-snug text-tinta-suave">
                  Iguales al libro impreso (amplios para doblar y engrapar).
                </span>
              </label>

              <label
                class="flex cursor-pointer flex-col gap-1 rounded-sm border p-3.5 transition-colors"
                classList={{
                  "border-acento-borde bg-acento-tenue": margenes() === "compacto",
                  "border-linea-fuerte hover:border-borde-hover": margenes() !== "compacto",
                }}
              >
                <span class="flex items-center gap-2 text-sm font-semibold text-tinta">
                  <input
                    type="radio"
                    name="margenes"
                    value="compacto"
                    checked={margenes() === "compacto"}
                    onChange={() => setMargenes("compacto")}
                    class="accent-acento-borde"
                  />
                  Aprovechar más la hoja
                </span>
                <span class="text-xs leading-snug text-tinta-suave">
                  Márgenes más compactos (caben más líneas por página).
                </span>
              </label>
            </div>
          </fieldset>

          <Show when={formato() === "folleto"}>
            <label class="flex flex-col gap-1.5">
              <span class={etiqueta}>Compensación del doblez al centro (mm)</span>
              <input
                type="number"
                min="0"
                max="5"
                step="0.25"
                class={`${campo} max-w-[160px]`}
                value={desplazamiento()}
                onInput={(e) => setDesplazamiento(e.currentTarget.value)}
              />
              <span class="text-xs text-tinta-tenue">
                Deja 0 para salir igual que Acrobat; usa entre 0.5 y 1.5 mm si las hojas centrales
                sobresalen al doblar.
              </span>
            </label>
          </Show>

          <div class="flex flex-col gap-2.5 rounded-sm border border-linea bg-superficie p-4">
            <label class="flex cursor-pointer items-start gap-2.5 text-sm text-tinta">
              <input
                type="checkbox"
                checked={multiploDe4()}
                onChange={(e) => setMultiploDe4(e.currentTarget.checked)}
                class="mt-1 accent-acento-borde"
              />
              <span>
                Completar páginas en blanco hasta múltiplo de 4{" "}
                <span class="block text-xs text-tinta-suave">
                  Mantiene el colofón en la última página al armar el cuadernillo.
                </span>
              </span>
            </label>
            <label class="flex cursor-pointer items-start gap-2.5 text-sm text-tinta">
              <input
                type="checkbox"
                checked={guiones()}
                onChange={(e) => setGuiones(e.currentTarget.checked)}
                class="mt-1 accent-acento-borde"
              />
              <span>
                Dividir palabras con guion al final de línea{" "}
                <span class="block text-xs text-tinta-suave">
                  Apagado iguala el diseño actual de la editorial; encendido reduce huecos entre
                  palabras.
                </span>
              </span>
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-1.5">
              <span class={etiqueta}>Página legal</span>
              <textarea
                class={`${campo} min-h-[120px] leading-relaxed`}
                value={legal()}
                onInput={(e) => setLegal(e.currentTarget.value)}
              />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class={etiqueta}>
                Colofón <span class="font-normal text-tinta-tenue">(opcional)</span>
              </span>
              <textarea
                class={`${campo} min-h-[120px] leading-relaxed`}
                value={colofon()}
                onInput={(e) => setColofon(e.currentTarget.value)}
                placeholder="Impreso en Editorial Huapango."
              />
            </label>
          </div>

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

          <Show when={resultado()}>
            {(r) => (
              <div
                aria-live="polite"
                class="flex flex-col gap-2.5 rounded-sm border border-linea-fuerte bg-superficie p-4 text-sm"
                data-testid="resultado-impresion"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="m-0 font-semibold text-tinta">
                      Listo: {r().paginas} páginas en media carta
                      {r().hojas !== null ? ` · ${r().hojas} hojas carta (${r().caras} caras)` : ""}
                    </p>
                    <p class="m-0 text-xs text-tinta-suave">
                      Fuentes libres incrustadas
                      {r().guardadoEnNube ? " · Copia guardada en la editorial" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => descargarBase64(r().nombreArchivo, r().pdfBase64)}
                    class="h-9 rounded-sm border border-borde px-4 text-[13px] font-semibold text-tinta hover:border-borde-hover"
                  >
                    Descargar de nuevo
                  </button>
                </div>

                <Show when={r().avisos.length > 0}>
                  <div class="rounded-sm border border-aviso-borde px-3 py-2 text-xs text-aviso">
                    <p class="m-0 font-semibold">Revisión de calidad de imágenes:</p>
                    <ul class="m-0 mt-1 list-disc pl-4">
                      <For each={r().avisos}>
                        {(a) => (
                          <li>
                            «{a.imagen}» en {a.pieza} queda a {a.ppp} ppp (se recomiendan al menos
                            300 ppp).
                          </li>
                        )}
                      </For>
                    </ul>
                  </div>
                </Show>

                <Show when={r().faltantes.length > 0}>
                  <div class="rounded-sm border border-error px-3 py-2 text-xs text-acento">
                    <p class="m-0 font-semibold">Imágenes no encontradas (no se incluyeron):</p>
                    <ul class="m-0 mt-1 list-disc pl-4">
                      <For each={r().faltantes}>{(f) => <li>{f}</li>}</For>
                    </ul>
                  </div>
                </Show>

                <Show when={r().advertencias.length > 0}>
                  <div class="rounded-sm border border-aviso-borde px-3 py-2 text-xs text-aviso">
                    <For each={r().advertencias}>{(w) => <p class="m-0">{w}</p>}</For>
                  </div>
                </Show>
              </div>
            )}
          </Show>

          <div class="flex flex-wrap items-center justify-end gap-3 border-t border-linea pt-4">
            <button
              type="button"
              disabled={ocupado()}
              onClick={() => props.onClose()}
              class="h-10 rounded-sm border border-linea-fuerte px-4 text-sm font-semibold text-tinta-2 hover:border-borde-hover disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={ocupado()}
              class="h-10 rounded-sm bg-acento-fondo px-6 text-sm font-semibold text-white hover:bg-acento-fondo-hover disabled:opacity-40"
            >
              {ocupado() ? "Preparando PDF…" : "Preparar y descargar PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
