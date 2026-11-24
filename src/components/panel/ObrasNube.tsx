import { A } from "@solidjs/router";
import { For, Show, createSignal, onMount } from "solid-js";
import { nuevaPieza, slugify } from "~/lib/libro/paquete";
import {
  ErrorPanel,
  agregarPieza,
  borrarObra,
  listarObras,
  portadaDe,
  publicarObra,
  retirarObra,
  subirPortada,
  type ObraNube,
} from "~/lib/panel/nube";
import { useSesion } from "./PanelShell";
import { EditarObraModal } from "./EditarObraModal";
import { ImprimirModal, type ObraParaImprimir } from "./ImprimirModal";

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );

const mensaje = (e: unknown) =>
  e instanceof ErrorPanel ? e.message : "Algo salió mal. Inténtalo de nuevo.";

function Estado(props: { obra: ObraNube }) {
  const texto = () =>
    props.obra.estado === "publicada"
      ? "Publicada"
      : props.obra.estado === "retirada"
        ? "Retirada"
        : "Borrador";
  return (
    <span
      class="rounded-full border px-3 py-1 text-xs"
      classList={{
        "border-tinta-2/50 text-tinta": props.obra.estado === "publicada",
        "border-aviso-borde text-aviso": props.obra.estado === "borrador",
        "border-borde text-tinta-suave": props.obra.estado === "retirada",
      }}
    >
      {texto()}
    </span>
  );
}

function ObraCard(props: { obra: ObraNube; onCambio: () => Promise<void> }) {
  const sesion = useSesion();
  const [ocupado, setOcupado] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [agregando, setAgregando] = createSignal(false);
  const [imprimir, setImprimir] = createSignal(false);
  const [editandoDatos, setEditandoDatos] = createSignal(false);
  const [titulo, setTitulo] = createSignal("");
  const [firma, setFirma] = createSignal("");
  let selector: HTMLInputElement | undefined;

  const hacer = async (que: string, accion: () => Promise<unknown>) => {
    setOcupado(que);
    setError(null);
    try {
      await accion();
      await props.onCambio();
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setOcupado(null);
    }
  };

  const palabras = () => props.obra.piezas.reduce((n, p) => n + (p.vigente?.stats?.words ?? 0), 0);
  const portada = () => portadaDe(props.obra);
  const sinPublicar = () =>
    props.obra.piezas.some((p) => p.version_vigente !== p.version_publicada);

  const elegirPortada = (e: Event & { currentTarget: HTMLInputElement }) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (file) void hacer("portada", () => subirPortada(props.obra, file));
  };

  const agregar = (e: SubmitEvent) => {
    e.preventDefault();
    const t = titulo().trim();
    if (t === "") return setError("Escribe el título de la pieza.");
    const base = `${props.obra.slug}-${slugify(t) || "pieza"}`;
    let slug = base;
    for (let n = 2; props.obra.piezas.some((p) => p.slug === slug); n += 1) slug = `${base}-${n}`;
    const pieza = nuevaPieza({
      slug,
      title: t,
      kind: "complemento",
      parentSlug: props.obra.slug,
      credit: firma().trim() || null,
    });
    void hacer("agregar", async () => {
      await agregarPieza(props.obra.id, pieza);
      setTitulo("");
      setFirma("");
      setAgregando(false);
    });
  };

  const paraImprimir = (): ObraParaImprimir => ({
    slug: props.obra.slug,
    origen: "nube",
    titulo: props.obra.titulo,
    autor: props.obra.autores.join(" y "),
    coleccion: props.obra.coleccion,
    creditos: props.obra.piezas.flatMap((p) =>
      p.firma && p.tipo === "complemento" ? [{ rol: p.titulo, nombre: p.firma }] : [],
    ),
  });

  const boton =
    "h-10 rounded-sm border border-borde px-4 text-[13px] font-semibold text-tinta hover:border-borde-hover disabled:opacity-40";
  const campo =
    "w-full rounded-sm border border-linea-fuerte bg-fondo px-3 py-2 text-sm text-tinta focus:border-acento-borde focus:outline-none";

  return (
    <li
      class="flex flex-col gap-5 rounded-sm border border-linea bg-superficie p-5 sm:flex-row sm:p-6"
      data-testid="obra"
    >
      <div class="flex shrink-0 flex-col items-center gap-2">
        <Show
          when={portada()}
          fallback={
            <div class="flex h-[180px] w-[124px] items-center justify-center rounded-sm border border-dashed border-borde p-3 text-center text-xs text-tinta-tenue">
              Sin portada
            </div>
          }
        >
          {(src) => (
            <img
              src={src()}
              alt={`Portada de ${props.obra.titulo}`}
              width="124"
              height="180"
              class="h-[180px] w-[124px] rounded-sm object-cover shadow-book"
            />
          )}
        </Show>
        <input
          ref={selector}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          onChange={elegirPortada}
          aria-label={`Subir portada de ${props.obra.titulo}`}
        />
        <button
          type="button"
          class="text-[13px] font-semibold text-acento underline-offset-4 hover:underline disabled:opacity-40"
          disabled={ocupado() !== null}
          onClick={() => selector?.click()}
        >
          {ocupado() === "portada" ? "Subiendo…" : portada() ? "Cambiar portada" : "Subir portada"}
        </button>
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 flex-col gap-1">
            <h3 class="m-0 font-serif text-2xl font-normal">{props.obra.titulo}</h3>
            <span class="text-[13px] text-tinta-suave">
              {props.obra.autores.join(" y ") || "Sin autoría"} ·{" "}
              {props.obra.tipo === "libro" ? "Libro" : "Ensayo gratuito"} ·{" "}
              {palabras().toLocaleString("es-MX")} palabras
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Show when={props.obra.estado === "publicada" && sinPublicar()}>
              <span class="rounded-full border border-aviso-borde px-3 py-1 text-xs text-aviso">
                Cambios sin publicar
              </span>
            </Show>
            <Estado obra={props.obra} />
          </div>
        </div>

        <ul class="m-0 flex list-none flex-col divide-y divide-linea border-y border-linea p-0">
          <For each={props.obra.piezas}>
            {(p) => (
              <li class="flex flex-wrap items-center justify-between gap-3 py-3">
                <span class="flex min-w-0 flex-col">
                  <span class="font-serif text-lg text-tinta">{p.titulo}</span>
                  <span class="text-[13px] text-tinta-suave">
                    {p.tipo === "complemento" ? "Complemento" : "Pieza principal"}
                    {p.firma ? ` · ${p.firma}` : ""}
                    {p.vigente
                      ? ` · ${(p.vigente.stats?.words ?? 0).toLocaleString("es-MX")} palabras · versión ${p.vigente.numero}, ${fecha(p.vigente.creado_en)}`
                      : ""}
                  </span>
                </span>
                <A
                  href={`/panel/${props.obra.slug}/${p.slug}`}
                  class="rounded-sm bg-acento-fondo px-4 py-2 text-[13px] font-semibold text-white no-underline hover:bg-acento-fondo-hover"
                >
                  Editar
                </A>
              </li>
            )}
          </For>
        </ul>

        <Show when={agregando()}>
          <form onSubmit={agregar} class="flex flex-col gap-3 rounded-sm bg-fondo p-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="flex flex-col gap-1.5 text-[13px] font-semibold text-tinta-2">
                Título de la pieza
                <input
                  class={campo}
                  value={titulo()}
                  onInput={(e) => setTitulo(e.currentTarget.value)}
                  placeholder="Prólogo"
                  autocomplete="off"
                />
              </label>
              <label class="flex flex-col gap-1.5 text-[13px] font-semibold text-tinta-2">
                Quién la firma <span class="font-normal text-tinta-tenue">(opcional)</span>
                <input
                  class={campo}
                  value={firma()}
                  onInput={(e) => setFirma(e.currentTarget.value)}
                  autocomplete="off"
                />
              </label>
            </div>
            <div class="flex gap-3">
              <button
                type="submit"
                disabled={ocupado() !== null}
                class="h-10 rounded-sm bg-acento-fondo px-5 text-[13px] font-semibold text-white hover:bg-acento-fondo-hover disabled:opacity-40"
              >
                {ocupado() === "agregar" ? "Agregando…" : "Agregar pieza"}
              </button>
              <button
                type="button"
                onClick={() => setAgregando(false)}
                class="text-[13px] text-tinta-suave hover:text-tinta"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Show>

        <Show when={error()}>
          {(m) => (
            <p
              role="alert"
              class="m-0 rounded-sm border border-error px-4 py-2.5 text-sm text-acento"
            >
              {m()}
            </p>
          )}
        </Show>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class={boton}
            disabled={ocupado() !== null}
            onClick={() => setEditandoDatos(true)}
          >
            Editar datos
          </button>
          <button
            type="button"
            class={boton}
            disabled={ocupado() !== null}
            onClick={() => setImprimir(true)}
          >
            Imprimir (PDF)
          </button>
          <Show when={props.obra.tipo === "libro" && !agregando()}>
            <button type="button" class={boton} onClick={() => setAgregando(true)}>
              + Agregar prólogo, epílogo u otra pieza
            </button>
          </Show>
          <Show
            when={sesion.esAdmin()}
            fallback={
              <span class="text-[13px] text-tinta-tenue">
                {props.obra.estado === "publicada" ? "" : "La publica Dirección."}
              </span>
            }
          >
            <Show when={props.obra.estado !== "publicada" || sinPublicar()}>
              <button
                type="button"
                disabled={ocupado() !== null}
                onClick={() => void hacer("publicar", () => publicarObra(props.obra.id))}
                class="h-10 rounded-sm bg-acento-fondo px-5 text-[13px] font-semibold text-white hover:bg-acento-fondo-hover disabled:opacity-40"
              >
                {ocupado() === "publicar"
                  ? "Publicando…"
                  : props.obra.estado === "publicada"
                    ? "Publicar cambios"
                    : "Publicar"}
              </button>
            </Show>
            <Show when={props.obra.estado === "publicada"}>
              <button
                type="button"
                class={boton}
                disabled={ocupado() !== null}
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Retirar «${props.obra.titulo}» del sitio? Se puede volver a publicar.`,
                    )
                  )
                    void hacer("retirar", () => retirarObra(props.obra.id));
                }}
              >
                Retirar del sitio
              </button>
            </Show>
            <button
              type="button"
              class="ml-auto h-10 px-2 text-[13px] text-tinta-tenue hover:text-acento disabled:opacity-40"
              disabled={ocupado() !== null}
              onClick={() => {
                if (
                  window.confirm(
                    `¿Borrar «${props.obra.titulo}» con todas sus versiones? Esto no se puede deshacer.`,
                  )
                )
                  void hacer("borrar", () => borrarObra(props.obra.id));
              }}
            >
              Borrar
            </button>
          </Show>
        </div>
      </div>
      <Show when={imprimir()}>
        <ImprimirModal obra={paraImprimir()} onClose={() => setImprimir(false)} />
      </Show>
      <Show when={editandoDatos()}>
        <EditarObraModal
          obra={props.obra}
          onGuardado={props.onCambio}
          onClose={() => setEditandoDatos(false)}
        />
      </Show>
    </li>
  );
}

/** Obras guardadas en la base de datos de la editorial. */
export function ObrasNube() {
  const [obras, setObras] = createSignal<ObraNube[] | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const cargar = async () => {
    try {
      setObras(await listarObras());
      setError(null);
    } catch (e) {
      setError(mensaje(e));
    }
  };
  onMount(() => void cargar());

  return (
    <section aria-labelledby="obras" class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="flex flex-col gap-1">
          <h2 id="obras" class="m-0 font-serif text-2xl font-normal">
            Obras de la editorial
          </h2>
          <p class="m-0 max-w-[680px] text-[13px] leading-relaxed text-tinta-suave">
            Cada vez que guardas queda una versión; nada se pierde. Lo que publica Dirección es lo
            que ven los lectores.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <A
            href="/panel/importar"
            class="rounded-sm border border-borde px-5 py-2.5 text-sm font-semibold text-tinta no-underline hover:border-borde-hover"
          >
            Importar libro (EPUB)
          </A>
          <A
            href="/panel/nuevo"
            class="rounded-sm bg-acento-fondo px-5 py-2.5 text-sm font-semibold text-white no-underline hover:bg-acento-fondo-hover"
          >
            + Nueva obra
          </A>
        </div>
      </div>
      <Show when={error()}>
        {(m) => (
          <p role="alert" class="m-0 rounded-sm border border-error px-4 py-3 text-sm text-acento">
            {m()}
          </p>
        )}
      </Show>
      <Show when={obras()} fallback={<p class="m-0 text-sm text-tinta-suave">Cargando obras…</p>}>
        {(lista) => (
          <Show
            when={lista().length > 0}
            fallback={
              <p class="m-0 rounded-sm border border-dashed border-borde px-5 py-6 text-sm text-tinta-suave">
                Todavía no hay obras. Importa un libro desde su EPUB o empieza uno con «Nueva obra».
              </p>
            }
          >
            <ul class="m-0 flex list-none flex-col gap-6 p-0">
              <For each={lista()}>{(o) => <ObraCard obra={o} onCambio={cargar} />}</For>
            </ul>
          </Show>
        )}
      </Show>
    </section>
  );
}
