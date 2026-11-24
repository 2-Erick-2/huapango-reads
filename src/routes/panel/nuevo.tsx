import { A, useNavigate } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";
import { PanelShell } from "~/components/panel/PanelShell";
import { MANIFESTS } from "~/lib/contenido/manifests.generated";
import { nuevaObra, slugify, type TipoObra } from "~/lib/libro/paquete";
import { ErrorPanel, crearObra } from "~/lib/panel/nube";

const TIPOS: ReadonlyArray<{ id: TipoObra; nombre: string; detalle: string }> = [
  {
    id: "libro",
    nombre: "Libro",
    detalle:
      "Una obra de pago con su ficha en el catálogo. Puede llevar prólogo, epílogo y otras piezas ligadas.",
  },
  {
    id: "ensayo",
    nombre: "Ensayo",
    detalle:
      "Una sola pieza de acceso libre. Aparece en la fila «Ensayos» del inicio y se lee sin comprar.",
  },
];

/** Formulario para empezar una obra nueva: libro o ensayo. Crea el borrador y abre el editor. */
export default function NuevaObra() {
  const navigate = useNavigate();
  const [tipo, setTipo] = createSignal<TipoObra>("ensayo");
  const [titulo, setTitulo] = createSignal("");
  const [autores, setAutores] = createSignal("");
  const [resumen, setResumen] = createSignal("");
  const [identificador, setIdentificador] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [creando, setCreando] = createSignal(false);

  const slug = () => identificador().trim() || slugify(titulo());

  const crear = async (e: SubmitEvent) => {
    e.preventDefault();
    if (creando()) return;
    const obra = nuevaObra({
      tipo: tipo(),
      titulo: titulo(),
      autores: autores().split(","),
      sinopsis: resumen(),
      obra: identificador().trim() || undefined,
    });
    if (obra.titulo === "") return setError("Escribe el título.");
    if (obra.autores.length === 0) return setError("Escribe al menos un autor.");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(obra.obra))
      return setError("La dirección solo admite letras minúsculas sin acentos, números y guiones.");
    if (obra.obra in MANIFESTS)
      return setError("Ya hay un libro de la demostración con esa dirección. Elige otra.");
    setCreando(true);
    setError(null);
    try {
      await crearObra(
        {
          slug: obra.obra,
          tipo: obra.tipo,
          titulo: obra.titulo,
          autores: obra.autores,
          sinopsis: obra.sinopsis,
        },
        obra.piezas,
        "Obra nueva",
      );
      navigate(`/panel/${obra.obra}/${obra.obra}`);
    } catch (err) {
      setError(err instanceof ErrorPanel ? err.message : "No se pudo crear la obra.");
    } finally {
      setCreando(false);
    }
  };

  const campo =
    "w-full rounded-sm border border-linea-fuerte bg-superficie px-3 py-2.5 text-[15px] text-tinta placeholder:text-tinta-tenue focus:border-acento-borde focus:outline-none";
  const etiqueta = "text-[13px] font-semibold text-tinta-2";

  return (
    <PanelShell title="Nueva obra" path="/panel/nuevo">
      <main class="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-4 py-10 sm:px-8">
        <div class="flex flex-col gap-2">
          <A href="/panel" class="text-[13px] text-tinta-suave no-underline hover:text-tinta">
            ← Biblioteca
          </A>
          <h1 class="m-0 font-serif text-4xl font-light tracking-tight">Nueva obra</h1>
          <p class="m-0 text-[15px] leading-relaxed text-tinta-suave">
            Empieza un libro o un ensayo desde cero. Al crearla se abre el editor; cada vez que
            guardas queda una versión en la base de la editorial.
          </p>
        </div>

        <form onSubmit={(e) => void crear(e)} class="flex flex-col gap-6" noValidate>
          <fieldset class="m-0 flex flex-col gap-3 border-0 p-0">
            <legend class={`${etiqueta} mb-3 p-0`}>¿Qué vas a escribir?</legend>
            <div class="grid gap-3 sm:grid-cols-2">
              <For each={TIPOS}>
                {(t) => (
                  <label
                    class="flex cursor-pointer flex-col gap-1.5 rounded-sm border p-4 transition-colors"
                    classList={{
                      "border-acento-borde bg-acento-fondo/10": tipo() === t.id,
                      "border-linea-fuerte hover:border-borde-hover": tipo() !== t.id,
                    }}
                  >
                    <span class="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="tipo"
                        value={t.id}
                        checked={tipo() === t.id}
                        onChange={() => setTipo(t.id)}
                        class="accent-acento-borde"
                      />
                      <span class="font-serif text-xl">{t.nombre}</span>
                    </span>
                    <span class="text-[13px] leading-snug text-tinta-suave">{t.detalle}</span>
                  </label>
                )}
              </For>
            </div>
          </fieldset>

          <div class="flex flex-col gap-2">
            <label for="titulo" class={etiqueta}>
              Título
            </label>
            <input
              id="titulo"
              class={campo}
              value={titulo()}
              onInput={(e) => setTitulo(e.currentTarget.value)}
              placeholder="El poder de la sombra"
              autocomplete="off"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="autores" class={etiqueta}>
              Autoría
            </label>
            <input
              id="autores"
              class={campo}
              value={autores()}
              onInput={(e) => setAutores(e.currentTarget.value)}
              placeholder="Nombre Apellido (separa varios con coma)"
              autocomplete="off"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="resumen" class={etiqueta}>
              {tipo() === "libro" ? "Sinopsis" : "Resumen"}{" "}
              <span class="font-normal text-tinta-tenue">(opcional por ahora)</span>
            </label>
            <textarea
              id="resumen"
              class={`${campo} min-h-[110px] leading-relaxed`}
              value={resumen()}
              onInput={(e) => setResumen(e.currentTarget.value)}
              placeholder="Dos o tres frases que inviten a leer."
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="identificador" class={etiqueta}>
              Dirección en la web{" "}
              <span class="font-normal text-tinta-tenue">(se arma sola con el título)</span>
            </label>
            <input
              id="identificador"
              class={campo}
              value={identificador()}
              onInput={(e) => setIdentificador(e.currentTarget.value)}
              placeholder={slugify(titulo()) || "el-poder-de-la-sombra"}
              autocomplete="off"
              spellcheck={false}
            />
            <p class="m-0 text-xs text-tinta-tenue">Dirección: /leer/{slug() || "…"}</p>
          </div>

          <Show when={error()}>
            {(message) => (
              <p
                role="alert"
                class="m-0 rounded-sm border border-error px-4 py-3 text-sm text-acento"
              >
                {message()}
              </p>
            )}
          </Show>

          <div class="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              class="h-12 rounded-sm bg-acento-fondo px-7 text-sm font-semibold text-white hover:bg-acento-fondo-hover"
            >
              {creando() ? "Creando…" : "Crear y empezar a escribir"}
            </button>
            <A href="/panel" class="text-sm text-tinta-suave no-underline hover:text-tinta">
              Cancelar
            </A>
          </div>
        </form>
      </main>
    </PanelShell>
  );
}
