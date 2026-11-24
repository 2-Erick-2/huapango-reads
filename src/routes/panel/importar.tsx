import { A, useNavigate } from "@solidjs/router";
import { For, Index, Match, Show, Switch, createMemo, createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { PanelShell } from "~/components/panel/PanelShell";
import { PreviewModal } from "~/components/panel/PreviewModal";
import { MANIFESTS } from "~/lib/contenido/manifests.generated";
import { slugify } from "~/lib/libro/paquete";
import type { Pieza } from "~/lib/libro/types";
import {
  ErrorPanel,
  crearObra,
  problemaDePortada,
  registrarImportacion,
  subirImagenes,
  subirPortada,
  tokenDeSesion,
} from "~/lib/panel/nube";
import type {
  DecisionFuente,
  FuenteAnalizada,
  PeticionRevisar,
  ResultadoRevision,
  RolEstilo,
} from "~/server/importar-epub";

type TipoObra = "libro" | "ensayo";
type RolImagen = DecisionFuente["imagenes"][string]["rol"];

const ESTILOS: ReadonlyArray<{ id: RolEstilo; nombre: string }> = [
  { id: "auto", nombre: "Automático" },
  { id: "titulo1", nombre: "Título" },
  { id: "titulo2", nombre: "Título de capítulo" },
  { id: "parrafo", nombre: "Párrafo" },
  { id: "firma", nombre: "Firma" },
  { id: "ignorar", nombre: "No incluir" },
];
const TEXTOS: ReadonlyArray<{ id: string; nombre: string }> = [
  { id: "auto", nombre: "Según su estilo" },
  { id: "firma", nombre: "Firma" },
  { id: "ornamento", nombre: "Cierre (FIN, * * *)" },
  { id: "titulo1", nombre: "Título" },
  { id: "parrafo", nombre: "Párrafo" },
  { id: "ignorar", nombre: "No incluir" },
];
const IMAGENES: ReadonlyArray<{ id: RolImagen; nombre: string }> = [
  { id: "portadilla", nombre: "Portadilla (página completa)" },
  { id: "ilustracion", nombre: "Ilustración" },
  { id: "divisor", nombre: "Divisor" },
  { id: "ornamento", nombre: "Adorno" },
  { id: "titulo", nombre: "Título dentro de la imagen" },
  { id: "capitulo", nombre: "Tarjeta de capítulo" },
  { id: "ignorar", nombre: "No incluir" },
];

interface PiezaEnPantalla {
  inicio: number;
  titulo: string;
  principal: boolean;
  capitular: boolean;
}
interface ImagenEnPantalla {
  rol: RolImagen;
  texto: string;
  alt: string;
  /** -1 = donde está en el archivo */
  antes: number;
}
interface FuenteEnPantalla {
  estilos: Record<string, RolEstilo>;
  textos: Record<string, string>;
  imagenes: Record<string, ImagenEnPantalla>;
  piezas: PiezaEnPantalla[];
}

const corto = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n)}…` : t);
const campo =
  "w-full rounded-sm border border-linea-fuerte bg-superficie px-3 py-2.5 text-[15px] text-tinta placeholder:text-tinta-tenue focus:border-acento-borde focus:outline-none";
const selector =
  "rounded-sm border border-linea-fuerte bg-fondo px-2 py-2 text-sm text-tinta focus:border-acento-borde focus:outline-none";
const etiqueta = "text-[13px] font-semibold text-tinta-2";

async function llamar<T>(form: FormData): Promise<T> {
  const respuesta = await fetch(
    `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/panel/importar`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${await tokenDeSesion()}` },
      body: form,
    },
  );
  const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
  if (!respuesta.ok) throw new ErrorPanel(cuerpo.error ?? "No se pudo procesar el archivo.");
  return cuerpo as T;
}

function Importar() {
  const navigate = useNavigate();
  const [paso, setPaso] = createSignal<1 | 2 | 3>(1);
  const [archivos, setArchivos] = createSignal<File[]>([]);
  const [tipo, setTipo] = createSignal<TipoObra>("libro");
  const [titulo, setTitulo] = createSignal("");
  const [autores, setAutores] = createSignal("");
  const [sinopsis, setSinopsis] = createSignal("");
  const [direccion, setDireccion] = createSignal("");
  const [analisis, setAnalisis] = createSignal<FuenteAnalizada[]>([]);
  const [decision, setDecision] = createStore<{ fuentes: FuenteEnPantalla[] }>({ fuentes: [] });
  const [resultado, setResultado] = createSignal<ResultadoRevision | null>(null);
  const [portada, setPortada] = createSignal<File | null>(null);
  const [ocupado, setOcupado] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [vista, setVista] = createSignal<Pieza | null>(null);

  const slug = () => direccion().trim() || slugify(titulo());
  const autoresLista = () =>
    autores()
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

  const fallo = (e: unknown) =>
    setError(e instanceof ErrorPanel ? e.message : "Algo salió mal. Inténtalo de nuevo.");

  const conArchivos = (accion: string) => {
    const form = new FormData();
    form.set("accion", accion);
    for (const a of archivos()) form.append("archivos", a, a.name);
    return form;
  };

  // ---------------------------------------------------------- paso 1 → 2
  const analizar = async (e: SubmitEvent) => {
    e.preventDefault();
    if (archivos().length === 0) return setError("Elige al menos un archivo EPUB.");
    if (titulo().trim() === "") return setError("Escribe el título de la obra.");
    if (autoresLista().length === 0) return setError("Escribe la autoría.");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug()))
      return setError("La dirección solo admite letras minúsculas sin acentos, números y guiones.");
    if (slug() in MANIFESTS)
      return setError("Ya hay un libro de la demostración con esa dirección. Elige otra.");
    setOcupado("analizar");
    setError(null);
    try {
      const { fuentes } = await llamar<{ fuentes: FuenteAnalizada[] }>(conArchivos("analizar"));
      setAnalisis(fuentes);
      setDecision({
        fuentes: fuentes.map((f, n) => ({
          estilos: Object.fromEntries(f.estilos.map((x) => [x.clase, x.propuesto])),
          textos: Object.fromEntries(f.textos.map((x) => [x.texto, x.propuesto as string])),
          imagenes: Object.fromEntries(
            f.imagenes.map((x) => [
              x.src,
              { rol: x.propuesto, texto: x.texto, alt: x.alt, antes: -1 },
            ]),
          ),
          piezas: f.piezas.map((p, k) => ({
            inicio: p.inicio,
            titulo: p.titulo || (n === 0 && k === 0 ? titulo().trim() : ""),
            principal: n === 0 && k === 0,
            capitular: n === 0 && k === 0,
          })),
        })),
      });
      setPaso(2);
    } catch (err) {
      fallo(err);
    } finally {
      setOcupado(null);
    }
  };

  // ---------------------------------------------------------- paso 2 → 3
  const piezasPlanas = createMemo(() =>
    decision.fuentes.flatMap((f, n) => f.piezas.map((p, k) => ({ n, k, p }))),
  );

  const peticion = (): PeticionRevisar => {
    const usados = new Set<string>([slug()]);
    return {
      obra: slug(),
      tipoObra: tipo(),
      fuentes: decision.fuentes.map((f) => ({
        estilos: { ...f.estilos },
        textos: { ...f.textos } as DecisionFuente["textos"],
        imagenes: Object.fromEntries(
          Object.entries(f.imagenes).map(([src, im]) => [
            src,
            {
              rol: im.rol,
              texto: im.texto,
              alt: im.alt,
              ...(im.antes >= 0 ? { antes: im.antes } : {}),
            },
          ]),
        ),
        piezas: f.piezas.map((p) => {
          let s = slug();
          if (!p.principal) {
            const base = `${slug()}-${slugify(p.titulo) || "pieza"}`;
            s = base;
            for (let i = 2; usados.has(s); i += 1) s = `${base}-${i}`;
          }
          usados.add(s);
          return {
            inicio: p.inicio,
            titulo: p.principal ? titulo().trim() : p.titulo.trim(),
            slug: s,
            tipo: p.principal ? ("libro" as const) : ("complemento" as const),
            capitular: p.capitular,
          };
        }),
      })),
    };
  };

  const revisarObra = async () => {
    const piezas = piezasPlanas();
    if (piezas.filter((x) => x.p.principal).length !== 1)
      return setError("Marca una sola pieza como la obra principal.");
    if (piezas.some((x) => !x.p.principal && x.p.titulo.trim() === ""))
      return setError("Escribe el título de cada pieza.");
    if (tipo() === "ensayo" && piezas.length > 1)
      return setError(
        "Un ensayo es de una sola pieza. Quita las demás o importa la obra como libro.",
      );
    setOcupado("revisar");
    setError(null);
    try {
      const form = conArchivos("revisar");
      form.set("decisiones", JSON.stringify(peticion()));
      setResultado(await llamar<ResultadoRevision>(form));
      setPaso(3);
      window.scrollTo({ top: 0 });
    } catch (err) {
      fallo(err);
    } finally {
      setOcupado(null);
    }
  };

  // ---------------------------------------------------------- paso 3: guardar
  const guardar = async () => {
    const r = resultado();
    if (!r?.ok) return;
    setOcupado("guardar");
    setError(null);
    try {
      const datos = {
        slug: slug(),
        tipo: tipo(),
        titulo: titulo().trim(),
        autores: autoresLista(),
        sinopsis: sinopsis().trim(),
      };
      const id = await crearObra(datos, r.piezas, "Importada desde EPUB");
      const obra = { id, slug: datos.slug };
      await subirImagenes(obra, r.imagenes);
      await registrarImportacion(
        obra,
        archivos(),
        { comprobaciones: r.comprobaciones, avisos: r.avisos },
        peticion(),
      );
      const p = portada();
      if (p) await subirPortada(obra, p);
      navigate("/panel");
    } catch (err) {
      fallo(err);
    } finally {
      setOcupado(null);
    }
  };

  const cambiarPieza = (n: number, k: number, cambio: Partial<PiezaEnPantalla>) =>
    setDecision(
      produce((d) => {
        const f = d.fuentes[n];
        const p = f?.piezas[k];
        if (!f || !p) return;
        Object.assign(p, cambio);
        if (cambio.principal) {
          for (const g of d.fuentes) for (const q of g.piezas) if (q !== p) q.principal = false;
        }
      }),
    );

  const imagenDeResultado = (name: string) => resultado()?.imagenes[name] ?? "";

  return (
    <main class="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-10 sm:px-8">
      <div class="flex flex-col gap-2">
        <A href="/panel" class="text-[13px] text-tinta-suave no-underline hover:text-tinta">
          ← Biblioteca
        </A>
        <h1 class="m-0 font-serif text-4xl font-light tracking-tight">Importar un libro</h1>
        <ol class="m-0 flex list-none flex-wrap gap-2 p-0 text-[13px]" aria-label="Pasos">
          <For each={["Subir el EPUB", "Revisar cómo se armó", "Comprobar y guardar"]}>
            {(nombre, i) => (
              <li
                class="rounded-full border px-3 py-1"
                classList={{
                  "border-acento-borde text-tinta": paso() === i() + 1,
                  "border-linea-fuerte text-tinta-tenue": paso() !== i() + 1,
                }}
                aria-current={paso() === i() + 1 ? "step" : undefined}
              >
                {i() + 1}. {nombre}
              </li>
            )}
          </For>
        </ol>
      </div>

      <Show when={error()}>
        {(m) => (
          <p role="alert" class="m-0 rounded-sm border border-error px-4 py-3 text-sm text-acento">
            {m()}
          </p>
        )}
      </Show>

      <Switch>
        {/* ------------------------------------------------ Paso 1 */}
        <Match when={paso() === 1}>
          <form
            onSubmit={(e) => void analizar(e)}
            class="flex max-w-[760px] flex-col gap-6"
            noValidate
          >
            <div class="flex flex-col gap-2">
              <label for="epub" class={etiqueta}>
                Archivo(s) EPUB exportados desde InDesign
              </label>
              <input
                id="epub"
                type="file"
                accept=".epub,application/epub+zip"
                multiple
                onChange={(e) => setArchivos([...(e.currentTarget.files ?? [])])}
                class="text-sm text-tinta-2 file:mr-4 file:rounded-sm file:border-0 file:bg-control file:px-4 file:py-2 file:text-sm file:font-semibold file:text-tinta"
              />
              <p class="m-0 text-xs text-tinta-tenue">
                Si el libro viene en varios archivos (por ejemplo, el cuento y su prólogo por
                separado), súbelos todos juntos. Si un solo archivo trae todo, súbelo solo.
              </p>
            </div>

            <fieldset class="m-0 flex flex-col gap-3 border-0 p-0">
              <legend class={`${etiqueta} mb-3 p-0`}>Tipo de obra</legend>
              <div class="flex flex-wrap gap-3">
                <For
                  each={
                    [
                      { id: "libro", nombre: "Libro" },
                      { id: "ensayo", nombre: "Ensayo gratuito" },
                    ] as const
                  }
                >
                  {(t) => (
                    <label
                      class="flex cursor-pointer items-center gap-2.5 rounded-sm border px-4 py-3"
                      classList={{
                        "border-acento-borde bg-acento-fondo/10": tipo() === t.id,
                        "border-linea-fuerte": tipo() !== t.id,
                      }}
                    >
                      <input
                        type="radio"
                        name="tipo"
                        checked={tipo() === t.id}
                        onChange={() => setTipo(t.id)}
                        class="accent-acento-borde"
                      />
                      {t.nombre}
                    </label>
                  )}
                </For>
              </div>
            </fieldset>

            <div class="grid gap-5 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label for="titulo" class={etiqueta}>
                  Título
                </label>
                <input
                  id="titulo"
                  class={campo}
                  value={titulo()}
                  onInput={(e) => setTitulo(e.currentTarget.value)}
                  autocomplete="off"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label for="autores" class={etiqueta}>
                  Autoría <span class="font-normal text-tinta-tenue">(separa varios con coma)</span>
                </label>
                <input
                  id="autores"
                  class={campo}
                  value={autores()}
                  onInput={(e) => setAutores(e.currentTarget.value)}
                  autocomplete="off"
                />
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <label for="sinopsis" class={etiqueta}>
                {tipo() === "libro" ? "Sinopsis" : "Resumen"}{" "}
                <span class="font-normal text-tinta-tenue">(opcional por ahora)</span>
              </label>
              <textarea
                id="sinopsis"
                class={`${campo} min-h-[96px]`}
                value={sinopsis()}
                onInput={(e) => setSinopsis(e.currentTarget.value)}
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="direccion" class={etiqueta}>
                Dirección en la web{" "}
                <span class="font-normal text-tinta-tenue">(se arma sola con el título)</span>
              </label>
              <input
                id="direccion"
                class={campo}
                value={direccion()}
                placeholder={slugify(titulo()) || "mi-libro"}
                onInput={(e) => setDireccion(e.currentTarget.value)}
                autocomplete="off"
                spellcheck={false}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={ocupado() !== null}
                class="h-12 rounded-sm bg-acento-fondo px-7 text-sm font-semibold text-white hover:bg-acento-fondo-hover disabled:opacity-40"
              >
                {ocupado() === "analizar" ? "Leyendo el archivo…" : "Continuar"}
              </button>
            </div>
          </form>
        </Match>

        {/* ------------------------------------------------ Paso 2 */}
        <Match when={paso() === 2}>
          <p class="m-0 max-w-[820px] text-[15px] leading-relaxed text-tinta-suave">
            Propusimos cómo armar la obra. Revisa cada archivo: qué es título, firma o párrafo, qué
            hace cada imagen y dónde empieza cada pieza. Si algo no te convence, cámbialo; en el
            siguiente paso verás el resultado y la revisión de que no falte texto.
          </p>
          <Index each={analisis()}>
            {(f, n) => (
              <section class="flex flex-col gap-6 rounded-sm border border-linea bg-superficie p-5 sm:p-6">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 class="m-0 font-serif text-2xl font-normal">{f().archivo}</h2>
                  <span class="text-[13px] text-tinta-suave">
                    {f().parrafos} párrafos · {f().palabras.toLocaleString("es-MX")} palabras ·{" "}
                    {f().imagenes.length} imágenes
                  </span>
                </div>

                {/* Piezas */}
                <div class="flex flex-col gap-3">
                  <h3 class="m-0 text-sm font-semibold uppercase tracking-[0.16em] text-acento">
                    Piezas
                  </h3>
                  <Index each={decision.fuentes[n]?.piezas ?? []}>
                    {(p, k) => (
                      <div class="grid items-end gap-3 rounded-sm bg-fondo p-3 lg:grid-cols-[1fr_1.4fr_auto_auto_auto]">
                        <label class="flex flex-col gap-1 text-[13px] text-tinta-2">
                          Título
                          <input
                            class={selector}
                            value={p().principal ? titulo() : p().titulo}
                            disabled={p().principal}
                            onInput={(e) => cambiarPieza(n, k, { titulo: e.currentTarget.value })}
                            placeholder={p().principal ? undefined : "Prólogo"}
                          />
                        </label>
                        <label class="flex min-w-0 flex-col gap-1 text-[13px] text-tinta-2">
                          Empieza en
                          <select
                            class={`${selector} min-w-0`}
                            value={p().inicio}
                            onChange={(e) =>
                              cambiarPieza(n, k, { inicio: Number(e.currentTarget.value) })
                            }
                          >
                            <For each={f().bloques}>
                              {(b) =>
                                b.tipo === "texto" ? (
                                  <option value={b.i}>
                                    {b.i + 1}. {corto(b.texto)}
                                  </option>
                                ) : null
                              }
                            </For>
                          </select>
                        </label>
                        <label class="flex items-center gap-2 text-[13px] text-tinta-2">
                          <input
                            type="radio"
                            name="principal"
                            checked={p().principal}
                            onChange={() => cambiarPieza(n, k, { principal: true })}
                            class="accent-acento-borde"
                          />
                          Obra principal
                        </label>
                        <label class="flex items-center gap-2 text-[13px] text-tinta-2">
                          <input
                            type="checkbox"
                            checked={p().capitular}
                            onChange={(e) =>
                              cambiarPieza(n, k, { capitular: e.currentTarget.checked })
                            }
                            class="accent-acento-borde"
                          />
                          Capitular
                        </label>
                        <button
                          type="button"
                          disabled={(decision.fuentes[n]?.piezas.length ?? 0) <= 1}
                          onClick={() =>
                            setDecision(produce((d) => d.fuentes[n]?.piezas.splice(k, 1)))
                          }
                          class="h-9 px-2 text-[13px] text-tinta-tenue hover:text-acento disabled:opacity-30"
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </Index>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setDecision(
                          produce((d) =>
                            d.fuentes[n]?.piezas.push({
                              inicio: 0,
                              titulo: "",
                              principal: false,
                              capitular: false,
                            }),
                          ),
                        )
                      }
                      class="h-9 rounded-sm border border-borde px-4 text-[13px] font-semibold text-tinta hover:border-borde-hover"
                    >
                      + Otra pieza en este archivo
                    </button>
                  </div>
                </div>

                {/* Estilos */}
                <div class="flex flex-col gap-3">
                  <h3 class="m-0 text-sm font-semibold uppercase tracking-[0.16em] text-acento">
                    Estilos de párrafo
                  </h3>
                  <ul class="m-0 flex list-none flex-col divide-y divide-linea p-0">
                    <For each={f().estilos}>
                      {(e) => (
                        <li class="flex flex-wrap items-center justify-between gap-3 py-2.5">
                          <span class="min-w-0 flex-1 text-sm">
                            <span class="font-serif text-tinta">«{corto(e.ejemplo, 90)}»</span>
                            <span class="block text-xs text-tinta-tenue">
                              {e.parrafos} {e.parrafos === 1 ? "párrafo" : "párrafos"} con este
                              estilo
                            </span>
                          </span>
                          <select
                            class={selector}
                            aria-label={`Papel del estilo de «${corto(e.ejemplo, 30)}»`}
                            value={decision.fuentes[n]?.estilos[e.clase] ?? "auto"}
                            onChange={(ev) =>
                              setDecision(
                                "fuentes",
                                n,
                                "estilos",
                                e.clase,
                                ev.currentTarget.value as RolEstilo,
                              )
                            }
                          >
                            <For each={ESTILOS}>
                              {(o) => <option value={o.id}>{o.nombre}</option>}
                            </For>
                          </select>
                        </li>
                      )}
                    </For>
                  </ul>
                  <Show when={f().textos.length > 0}>
                    <ul class="m-0 flex list-none flex-col divide-y divide-linea p-0">
                      <For each={f().textos}>
                        {(t) => (
                          <li class="flex flex-wrap items-center justify-between gap-3 py-2.5">
                            <span class="font-serif text-sm text-tinta">«{t.texto}»</span>
                            <select
                              class={selector}
                              aria-label={`Papel de «${t.texto}»`}
                              value={decision.fuentes[n]?.textos[t.texto] ?? "auto"}
                              onChange={(ev) =>
                                setDecision("fuentes", n, "textos", t.texto, ev.currentTarget.value)
                              }
                            >
                              <For each={TEXTOS}>
                                {(o) => <option value={o.id}>{o.nombre}</option>}
                              </For>
                            </select>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </div>

                {/* Imágenes */}
                <Show when={f().imagenes.length > 0}>
                  <div class="flex flex-col gap-3">
                    <h3 class="m-0 text-sm font-semibold uppercase tracking-[0.16em] text-acento">
                      Imágenes
                    </h3>
                    <ul class="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
                      <For each={f().imagenes}>
                        {(im) => {
                          const d = () => decision.fuentes[n]?.imagenes[im.src];
                          return (
                            <li class="flex flex-col gap-2 rounded-sm bg-fondo p-3">
                              <div class="flex h-[140px] items-center justify-center rounded-sm bg-papel p-2">
                                <img
                                  src={im.vista}
                                  alt=""
                                  class="max-h-full max-w-full object-contain"
                                />
                              </div>
                              <span class="truncate text-xs text-tinta-tenue" title={im.src}>
                                {im.src.split("/").pop()}
                              </span>
                              <select
                                class={selector}
                                aria-label="Qué es esta imagen"
                                value={d()?.rol ?? "ignorar"}
                                onChange={(ev) =>
                                  setDecision(
                                    "fuentes",
                                    n,
                                    "imagenes",
                                    im.src,
                                    "rol",
                                    ev.currentTarget.value as RolImagen,
                                  )
                                }
                              >
                                <For each={IMAGENES}>
                                  {(o) => <option value={o.id}>{o.nombre}</option>}
                                </For>
                              </select>
                              <Show when={d()?.rol === "titulo" || d()?.rol === "capitulo"}>
                                <input
                                  class={selector}
                                  value={d()?.texto ?? ""}
                                  placeholder={
                                    d()?.rol === "titulo"
                                      ? "Lo que dice (p. ej. Prólogo)"
                                      : "Nombre del capítulo"
                                  }
                                  onInput={(ev) =>
                                    setDecision(
                                      "fuentes",
                                      n,
                                      "imagenes",
                                      im.src,
                                      "texto",
                                      ev.currentTarget.value,
                                    )
                                  }
                                  aria-label="Texto de la imagen"
                                />
                              </Show>
                              <Show
                                when={
                                  d()?.rol !== "ignorar" &&
                                  d()?.rol !== "titulo" &&
                                  d()?.rol !== "capitulo"
                                }
                              >
                                <input
                                  class={selector}
                                  value={d()?.alt ?? ""}
                                  placeholder="Descripción para lectores ciegos (vacío = decorativa)"
                                  onInput={(ev) =>
                                    setDecision(
                                      "fuentes",
                                      n,
                                      "imagenes",
                                      im.src,
                                      "alt",
                                      ev.currentTarget.value,
                                    )
                                  }
                                  aria-label="Descripción de la imagen"
                                />
                              </Show>
                              <Show when={d()?.rol !== "ignorar"}>
                                <label class="flex flex-col gap-1 text-xs text-tinta-suave">
                                  {d()?.rol === "titulo"
                                    ? "Es el título de la pieza que empieza en"
                                    : "Va antes de"}
                                  <select
                                    class={`${selector} min-w-0`}
                                    value={d()?.antes ?? -1}
                                    onChange={(ev) =>
                                      setDecision(
                                        "fuentes",
                                        n,
                                        "imagenes",
                                        im.src,
                                        "antes",
                                        Number(ev.currentTarget.value),
                                      )
                                    }
                                  >
                                    <option value={-1}>Donde está en el archivo</option>
                                    <For each={f().bloques}>
                                      {(b) =>
                                        b.tipo === "texto" ? (
                                          <option value={b.i}>
                                            {b.i + 1}. {corto(b.texto, 60)}
                                          </option>
                                        ) : null
                                      }
                                    </For>
                                  </select>
                                </label>
                              </Show>
                            </li>
                          );
                        }}
                      </For>
                    </ul>
                  </div>
                </Show>
              </section>
            )}
          </Index>
          <div class="flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={ocupado() !== null}
              onClick={() => void revisarObra()}
              class="h-12 rounded-sm bg-acento-fondo px-7 text-sm font-semibold text-white hover:bg-acento-fondo-hover disabled:opacity-40"
            >
              {ocupado() === "revisar" ? "Armando y revisando…" : "Armar y revisar"}
            </button>
            <button
              type="button"
              onClick={() => setPaso(1)}
              class="text-sm text-tinta-suave hover:text-tinta"
            >
              Volver
            </button>
          </div>
        </Match>

        {/* ------------------------------------------------ Paso 3 */}
        <Match when={paso() === 3 && resultado()}>
          {(r) => (
            <div class="flex flex-col gap-8">
              <div
                class="flex flex-col gap-2 rounded-sm border p-5"
                classList={{ "border-tinta-2/40": r().ok, "border-error": !r().ok }}
                data-testid="resultado-importacion"
              >
                <p
                  class="m-0 font-serif text-2xl"
                  classList={{ "text-tinta": r().ok, "text-acento": !r().ok }}
                >
                  {r().ok
                    ? "Todo en orden: no falta texto y la obra cumple las reglas."
                    : "Hay problemas que resolver antes de guardar."}
                </p>
                <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                  <For each={r().comprobaciones}>
                    {(c) => (
                      <li
                        classList={{
                          "text-tinta-suave": c.ok,
                          "text-acento": !c.ok && c.grave,
                          "text-aviso": !c.ok && !c.grave,
                        }}
                      >
                        {c.ok ? "✓" : c.grave ? "✗" : "!"} {c.nombre}
                        <Show when={!c.ok}>
                          <span class="block pl-5 text-xs">{corto(c.detalle, 300)}</span>
                        </Show>
                      </li>
                    )}
                  </For>
                  <For each={r().errores}>{(e) => <li class="text-acento">✗ {e}</li>}</For>
                  <For each={r().avisos}>{(a) => <li class="text-aviso">! {a}</li>}</For>
                </ul>
              </div>

              <section class="flex flex-col gap-3">
                <h2 class="m-0 font-serif text-2xl font-normal">Piezas</h2>
                <ul class="m-0 flex list-none flex-col divide-y divide-linea border-y border-linea p-0">
                  <For each={r().piezas}>
                    {(p) => (
                      <li class="flex flex-wrap items-center justify-between gap-3 py-3">
                        <span class="flex flex-col">
                          <span class="font-serif text-lg text-tinta">{p.title}</span>
                          <span class="text-[13px] text-tinta-suave">
                            {p.kind === "complemento" ? "Complemento" : "Obra principal"}
                            {p.credit ? ` · ${p.credit}` : ""} ·{" "}
                            {p.stats.words.toLocaleString("es-MX")} palabras · {p.stats.minutes} min
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setVista(p)}
                          class="h-10 rounded-sm border border-borde px-4 text-[13px] font-semibold text-tinta hover:border-borde-hover"
                        >
                          Vista previa
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </section>

              <section class="flex flex-col gap-3">
                <h2 class="m-0 font-serif text-2xl font-normal">Portada</h2>
                <p class="m-0 text-[13px] text-tinta-suave">
                  La imagen que verán los lectores en el catálogo. JPG, PNG o WebP, de al menos 400
                  píxeles de ancho. Puedes subirla después desde la biblioteca.
                </p>
                <div class="flex flex-wrap items-center gap-5">
                  <Show
                    when={portada()}
                    fallback={
                      <div class="flex h-[180px] w-[124px] items-center justify-center rounded-sm border border-dashed border-borde text-xs text-tinta-tenue">
                        Sin portada
                      </div>
                    }
                  >
                    {(file) => (
                      <img
                        src={URL.createObjectURL(file())}
                        alt="Portada elegida"
                        class="h-[180px] w-[124px] rounded-sm object-cover shadow-book"
                      />
                    )}
                  </Show>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Elegir portada"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0] ?? null;
                      const problema = file ? problemaDePortada(file) : null;
                      if (problema) {
                        setError(problema);
                        e.currentTarget.value = "";
                        return;
                      }
                      setError(null);
                      setPortada(file);
                    }}
                    class="text-sm text-tinta-2 file:mr-4 file:rounded-sm file:border-0 file:bg-control file:px-4 file:py-2 file:text-sm file:font-semibold file:text-tinta"
                  />
                </div>
              </section>

              <div class="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  disabled={!r().ok || ocupado() !== null}
                  onClick={() => void guardar()}
                  class="h-12 rounded-sm bg-acento-fondo px-7 text-sm font-semibold text-white hover:bg-acento-fondo-hover disabled:opacity-40"
                >
                  {ocupado() === "guardar"
                    ? "Guardando en la editorial…"
                    : "Guardar en la editorial"}
                </button>
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  class="text-sm text-tinta-suave hover:text-tinta"
                >
                  Volver a revisar
                </button>
              </div>
            </div>
          )}
        </Match>
      </Switch>

      <Show when={vista()} keyed>
        {(p) => (
          <PreviewModal pieza={p} assetUrl={imagenDeResultado} onClose={() => setVista(null)} />
        )}
      </Show>
    </main>
  );
}

/** Importar y revisar (ADR 0021): EPUB → propuesta → decisiones → verificación → base de la editorial. */
export default function ImportarPage() {
  return (
    <PanelShell title="Importar un libro" path="/panel/importar">
      <Importar />
    </PanelShell>
  );
}
