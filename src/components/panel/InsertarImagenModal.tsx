import { Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import {
  PNG_MAX_BYTES,
  PPP_MINIMO_IMPRESION,
  calcularPppImpresion,
  leerPng,
  nombreAssetPng,
} from "~/lib/editor/imagenes";
import type { ImageBlock } from "~/lib/libro/types";
import { ErrorPanel, subirImagenEditor } from "~/lib/panel/nube";

export interface ImagenInsertada {
  asset: string;
  url: string;
  alt: string;
  role: ImageBlock["role"];
  decorative: boolean;
  widthPct: number | null;
  width: number;
  height: number;
}

const ROLES: ReadonlyArray<{
  id: Extract<ImageBlock["role"], "ilustracion" | "divisor" | "portadilla">;
  nombre: string;
  detalle: string;
}> = [
  { id: "ilustracion", nombre: "Ilustración", detalle: "Acompaña la lectura dentro de la página." },
  {
    id: "divisor",
    nombre: "Divisor o adorno",
    detalle: "Viñeta centrada entre escenas o secciones.",
  },
  {
    id: "portadilla",
    nombre: "Portadilla",
    detalle: "Imagen grande para abrir una pieza o capítulo.",
  },
];

const ANCHOS: ReadonlyArray<{ valor: number; etiqueta: string }> = [
  { valor: 100, etiqueta: "Ancho completo (100 %)" },
  { valor: 60, etiqueta: "Mediana (60 %)" },
  { valor: 35, etiqueta: "Chica / adorno (35 %)" },
];

/**
 * Modal del editor para subir e insertar una imagen PNG real en la obra (lectura digital e imprenta).
 * Comprueba la firma binaria PNG real y calcula los ppp efectivos antes de insertarla.
 */
export function InsertarImagenModal(props: {
  obraId: string;
  obraSlug: string;
  onInsertar: (imagen: ImagenInsertada) => void;
  onClose: () => void;
}) {
  const [archivo, setArchivo] = createSignal<File | null>(null);
  const [medidas, setMedidas] = createSignal<{ ancho: number; alto: number } | null>(null);
  const [previa, setPrevia] = createSignal<string | null>(null);
  const [role, setRole] = createSignal<"ilustracion" | "divisor" | "portadilla">("ilustracion");
  const [widthPct, setWidthPct] = createSignal(100);
  const [alt, setAlt] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [subiendo, setSubiendo] = createSignal(false);
  let cerrarBtn!: HTMLButtonElement;

  const limpiarPrevia = () => {
    const url = previa();
    if (url) URL.revokeObjectURL(url);
    setPrevia(null);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !subiendo()) props.onClose();
  };

  onMount(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    cerrarBtn.focus();
    onCleanup(() => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
      limpiarPrevia();
    });
  });

  const elegirArchivo = async (e: Event & { currentTarget: HTMLInputElement }) => {
    const file = e.currentTarget.files?.[0] ?? null;
    e.currentTarget.value = "";
    setError(null);
    setArchivo(null);
    setMedidas(null);
    limpiarPrevia();
    if (!file) return;

    if (file.size > PNG_MAX_BYTES) {
      setError("La imagen pesa más de 15 MB. Expórtala un poco más ligera.");
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const dims = leerPng(bytes);
    if (!dims) {
      setError(
        "Este archivo no es un PNG auténtico (aunque su nombre termine en .png). Expórtalo como PNG real para que conserve nitidez y transparencia.",
      );
      return;
    }

    setArchivo(file);
    setMedidas(dims);
    setPrevia(URL.createObjectURL(file));
  };

  const ppp = createMemo(() => {
    const m = medidas();
    if (!m) return null;
    return calcularPppImpresion(m.ancho, role(), role() === "portadilla" ? 100 : widthPct());
  });

  const insertar = async (e: SubmitEvent) => {
    e.preventDefault();
    const file = archivo();
    const dims = medidas();
    if (!file || !dims || subiendo()) return;
    setSubiendo(true);
    setError(null);
    try {
      const sufijo = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const asset = nombreAssetPng(file.name, sufijo);
      const subido = await subirImagenEditor(
        { id: props.obraId, slug: props.obraSlug },
        asset,
        file,
        dims,
      );
      const descripcion = alt().trim();
      props.onInsertar({
        asset: subido.asset,
        url: subido.url,
        alt: descripcion,
        role: role(),
        decorative: descripcion === "",
        widthPct: role() === "portadilla" ? null : widthPct(),
        width: dims.ancho,
        height: dims.alto,
      });
    } catch (err) {
      setError(
        err instanceof ErrorPanel ? err.message : "No se pudo subir la imagen. Inténtalo de nuevo.",
      );
      setSubiendo(false);
    }
  };

  const campo =
    "w-full rounded-sm border border-linea-fuerte bg-superficie px-3 py-2 text-sm text-tinta placeholder:text-tinta-tenue focus:border-acento-borde focus:outline-none";
  const etiqueta = "text-[13px] font-semibold text-tinta-2";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-insertar-imagen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-fondo-hondo/80 p-4 backdrop-blur-xs"
      data-testid="modal-insertar-imagen"
    >
      <div class="flex max-h-[92dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-sm border border-linea bg-fondo shadow-hoja">
        <div class="flex shrink-0 items-center justify-between gap-4 border-b border-linea bg-superficie px-5 py-4 sm:px-6">
          <div class="flex min-w-0 flex-col">
            <span class="text-[11px] font-bold uppercase tracking-[0.24em] text-acento">
              Imagen en el texto
            </span>
            <h2 id="titulo-insertar-imagen" class="m-0 font-serif text-2xl font-normal">
              Insertar imagen PNG
            </h2>
          </div>
          <button
            ref={cerrarBtn}
            type="button"
            disabled={subiendo()}
            onClick={() => props.onClose()}
            class="h-9 rounded-sm border border-linea-fuerte px-3.5 text-[13px] font-semibold text-tinta-2 hover:border-borde-hover disabled:opacity-40"
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={(e) => void insertar(e)}
          class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-6"
        >
          <div class="rounded-sm border border-aviso-borde bg-superficie px-4 py-3 text-[13px] leading-relaxed text-tinta-2">
            <strong class="font-semibold text-tinta">Usa imágenes PNG reales</strong>{" "}
            (preferiblemente con fondo transparente y al menos 1,050 px de ancho si ocupan todo el
            ancho de la página) para que se vean nítidas en lectura digital y al imprimir.
          </div>

          <label class="flex flex-col gap-2">
            <span class={etiqueta}>Archivo PNG</span>
            <input
              type="file"
              accept="image/png,.png"
              onChange={(e) => void elegirArchivo(e)}
              class="block w-full rounded-sm border border-dashed border-borde bg-superficie p-3 text-sm text-tinta file:mr-3 file:rounded-sm file:border-0 file:bg-acento-fondo file:px-3.5 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-borde-hover"
            />
          </label>

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

          <Show when={previa() && medidas()}>
            <div class="flex flex-col gap-4 rounded-sm border border-linea bg-superficie p-4">
              <div class="flex flex-wrap items-center gap-4">
                <img
                  src={previa() ?? ""}
                  alt="Vista previa de la imagen"
                  class="max-h-28 max-w-36 rounded-sm border border-linea bg-fondo object-contain p-1"
                />
                <div class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-tinta-suave">
                  <span class="truncate text-sm font-semibold text-tinta">{archivo()?.name}</span>
                  <span>
                    Medidas: {medidas()?.ancho} × {medidas()?.alto} px · PNG real comprobado
                  </span>
                  <Show when={ppp() !== null}>
                    <span
                      class={
                        (ppp() ?? 0) >= PPP_MINIMO_IMPRESION
                          ? "font-semibold text-tinta-2"
                          : "font-semibold text-aviso"
                      }
                    >
                      {(ppp() ?? 0) >= PPP_MINIMO_IMPRESION
                        ? `Calidad para imprimir: ${ppp()} ppp (óptima para papel y pantalla).`
                        : `Aviso para imprenta: a este tamaño queda a ${ppp()} ppp (se recomiendan al menos 300 ppp para papel). En lectura digital sí se verá bien.`}
                    </span>
                  </Show>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5">
                  <span class={etiqueta}>Papel en el libro</span>
                  <select
                    class={campo}
                    value={role()}
                    onChange={(e) => {
                      const v = e.currentTarget.value as "ilustracion" | "divisor" | "portadilla";
                      setRole(v);
                      if (v === "divisor") setWidthPct(35);
                      else if (v === "ilustracion" && widthPct() < 60) setWidthPct(100);
                    }}
                  >
                    {ROLES.map((r) => (
                      <option value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                  <span class="text-xs text-tinta-tenue">
                    {ROLES.find((r) => r.id === role())?.detalle}
                  </span>
                </label>

                <label class="flex flex-col gap-1.5">
                  <span class={etiqueta}>Tamaño en la página</span>
                  <select
                    class={campo}
                    disabled={role() === "portadilla"}
                    value={role() === "portadilla" ? 100 : widthPct()}
                    onChange={(e) => setWidthPct(Number(e.currentTarget.value))}
                  >
                    {ANCHOS.map((a) => (
                      <option value={a.valor}>{a.etiqueta}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label class="flex flex-col gap-1.5">
                <span class={etiqueta}>
                  Descripción breve{" "}
                  <span class="font-normal text-tinta-tenue">
                    (opcional; para lectores de pantalla)
                  </span>
                </span>
                <input
                  class={campo}
                  value={alt()}
                  onInput={(e) => setAlt(e.currentTarget.value)}
                  placeholder="Si es solo adorno, déjalo en blanco"
                  autocomplete="off"
                />
              </label>
            </div>
          </Show>

          <div class="flex items-center justify-end gap-3 border-t border-linea pt-4">
            <button
              type="button"
              disabled={subiendo()}
              onClick={() => props.onClose()}
              class="h-10 rounded-sm border border-linea-fuerte px-4 text-sm font-semibold text-tinta-2 hover:border-borde-hover disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!archivo() || !medidas() || subiendo()}
              class="h-10 rounded-sm bg-acento-fondo px-6 text-sm font-semibold text-white hover:bg-acento-fondo-hover disabled:opacity-40"
            >
              {subiendo() ? "Subiendo imagen…" : "Insertar en el texto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
