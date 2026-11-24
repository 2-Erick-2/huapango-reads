import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { COLLECTIONS } from "~/lib/catalog/data";
import { ErrorPanel, actualizarDatosObra, type ObraNube } from "~/lib/panel/nube";

/**
 * Modal para editar los metadatos públicos y editoriales de una obra guardada en Supabase:
 * título, subtítulo, autoría, colección, géneros, sinopsis, cita, precio digital, ISBN y fecha.
 */
export function EditarObraModal(props: {
  obra: ObraNube;
  onGuardado: () => Promise<void>;
  onClose: () => void;
}) {
  const [titulo, setTitulo] = createSignal(props.obra.titulo);
  const [subtitulo, setSubtitulo] = createSignal(props.obra.subtitulo ?? "");
  const [autores, setAutores] = createSignal(props.obra.autores.join(", "));
  const [coleccion, setColeccion] = createSignal(props.obra.coleccion ?? "cuentos-a-todas-partes");
  const [generos, setGeneros] = createSignal((props.obra.generos ?? []).join(", "));
  const [sinopsis, setSinopsis] = createSignal(props.obra.sinopsis);
  const [cita, setCita] = createSignal(props.obra.cita ?? "");
  const [precio, setPrecio] = createSignal(
    props.obra.precio_digital_mxn !== null && props.obra.precio_digital_mxn !== undefined
      ? String(props.obra.precio_digital_mxn)
      : "",
  );
  const [isbn, setIsbn] = createSignal(props.obra.isbn_digital ?? "");
  const [fecha, setFecha] = createSignal(props.obra.fecha_publicacion ?? "");
  const [guardando, setGuardando] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let cerrarBtn!: HTMLButtonElement;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !guardando()) props.onClose();
  };

  onMount(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    cerrarBtn.focus();
    onCleanup(() => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    });
  });

  const guardar = async (e: SubmitEvent) => {
    e.preventDefault();
    if (guardando()) return;
    const t = titulo().trim();
    if (!t) return setError("El título es obligatorio.");
    const listaAutores = autores()
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    if (listaAutores.length === 0) return setError("Escribe al menos una persona en autoría.");

    const precioLimpio = precio().trim();
    let precioNum: number | null = null;
    if (precioLimpio !== "") {
      const n = Number(precioLimpio);
      if (!Number.isInteger(n) || n < 0)
        return setError("El precio digital debe ser un número entero en pesos (o déjalo vacío).");
      precioNum = n;
    }

    setGuardando(true);
    setError(null);
    try {
      await actualizarDatosObra(props.obra.id, {
        titulo: t,
        subtitulo: subtitulo().trim() || null,
        autores: listaAutores,
        coleccion: props.obra.tipo === "libro" ? coleccion() : null,
        generos: generos()
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
        sinopsis: sinopsis().trim(),
        cita: cita().trim() || null,
        precio_digital_mxn: precioNum,
        isbn_digital: isbn().trim() || null,
        fecha_publicacion: fecha().trim() || null,
      });
      await props.onGuardado();
      props.onClose();
    } catch (err) {
      setError(
        err instanceof ErrorPanel
          ? err.message
          : "No se pudieron guardar los datos. Inténtalo de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const campo =
    "w-full rounded-sm border border-linea-fuerte bg-superficie px-3 py-2 text-sm text-tinta placeholder:text-tinta-tenue focus:border-acento-borde focus:outline-none";
  const etiqueta = "text-[13px] font-semibold text-tinta-2";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-editar-obra"
      class="fixed inset-0 z-50 flex items-center justify-center bg-fondo-hondo/80 p-4 backdrop-blur-xs"
      data-testid="modal-editar-obra"
    >
      <div class="flex max-h-[92dvh] w-full max-w-[740px] flex-col overflow-hidden rounded-sm border border-linea bg-fondo shadow-hoja">
        <div class="flex shrink-0 items-center justify-between gap-4 border-b border-linea bg-superficie px-5 py-4 sm:px-6">
          <div class="flex min-w-0 flex-col">
            <span class="text-[11px] font-bold uppercase tracking-[0.24em] text-acento">
              Datos de la obra
            </span>
            <h2 id="titulo-editar-obra" class="m-0 truncate font-serif text-2xl font-normal">
              {props.obra.titulo}
            </h2>
          </div>
          <button
            ref={cerrarBtn}
            type="button"
            disabled={guardando()}
            onClick={() => props.onClose()}
            class="h-9 rounded-sm border border-linea-fuerte px-3.5 text-[13px] font-semibold text-tinta-2 hover:border-borde-hover disabled:opacity-40"
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={(e) => void guardar(e)}
          class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-1.5">
              <span class={etiqueta}>Título</span>
              <input
                class={campo}
                value={titulo()}
                onInput={(e) => setTitulo(e.currentTarget.value)}
                autocomplete="off"
              />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class={etiqueta}>
                Subtítulo <span class="font-normal text-tinta-tenue">(opcional)</span>
              </span>
              <input
                class={campo}
                value={subtitulo()}
                onInput={(e) => setSubtitulo(e.currentTarget.value)}
                autocomplete="off"
              />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-1.5">
              <span class={etiqueta}>Autoría (separa varias con coma)</span>
              <input
                class={campo}
                value={autores()}
                onInput={(e) => setAutores(e.currentTarget.value)}
                autocomplete="off"
              />
            </label>
            <Show when={props.obra.tipo === "libro"}>
              <label class="flex flex-col gap-1.5">
                <span class={etiqueta}>Colección</span>
                <select
                  class={campo}
                  value={coleccion()}
                  onChange={(e) => setColeccion(e.currentTarget.value)}
                >
                  <For each={COLLECTIONS}>{(c) => <option value={c.slug}>{c.name}</option>}</For>
                </select>
              </label>
            </Show>
          </div>

          <label class="flex flex-col gap-1.5">
            <span class={etiqueta}>
              Géneros <span class="font-normal text-tinta-tenue">(separados por coma)</span>
            </span>
            <input
              class={campo}
              value={generos()}
              onInput={(e) => setGeneros(e.currentTarget.value)}
              placeholder="Cuento, Realismo mágico"
              autocomplete="off"
            />
          </label>

          <label class="flex flex-col gap-1.5">
            <span class={etiqueta}>Sinopsis</span>
            <textarea
              class={`${campo} min-h-[104px] leading-relaxed`}
              value={sinopsis()}
              onInput={(e) => setSinopsis(e.currentTarget.value)}
            />
          </label>

          <label class="flex flex-col gap-1.5">
            <span class={etiqueta}>
              Cita destacada <span class="font-normal text-tinta-tenue">(opcional)</span>
            </span>
            <input
              class={campo}
              value={cita()}
              onInput={(e) => setCita(e.currentTarget.value)}
              placeholder="Frase textual del libro para la ficha o portada"
              autocomplete="off"
            />
          </label>

          <Show when={props.obra.tipo === "libro"}>
            <div class="grid gap-4 sm:grid-cols-3">
              <label class="flex flex-col gap-1.5">
                <span class={etiqueta}>
                  Precio digital MXN{" "}
                  <span class="font-normal text-tinta-tenue">(vacío = Por confirmar)</span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  class={campo}
                  value={precio()}
                  onInput={(e) => setPrecio(e.currentTarget.value)}
                  placeholder="Por confirmar"
                />
              </label>
              <label class="flex flex-col gap-1.5">
                <span class={etiqueta}>ISBN digital</span>
                <input
                  class={campo}
                  value={isbn()}
                  onInput={(e) => setIsbn(e.currentTarget.value)}
                  placeholder="Por confirmar"
                  autocomplete="off"
                />
              </label>
              <label class="flex flex-col gap-1.5">
                <span class={etiqueta}>Fecha de publicación</span>
                <input
                  type="date"
                  class={campo}
                  value={fecha()}
                  onInput={(e) => setFecha(e.currentTarget.value)}
                />
              </label>
            </div>
          </Show>

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

          <div class="flex items-center justify-end gap-3 border-t border-linea pt-4">
            <button
              type="button"
              disabled={guardando()}
              onClick={() => props.onClose()}
              class="h-10 rounded-sm border border-linea-fuerte px-4 text-sm font-semibold text-tinta-2 hover:border-borde-hover disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando()}
              class="h-10 rounded-sm bg-acento-fondo px-6 text-sm font-semibold text-white hover:bg-acento-fondo-hover disabled:opacity-40"
            >
              {guardando() ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
