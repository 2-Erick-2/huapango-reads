import { HttpStatusCode } from "@solidjs/start";
import { A } from "@solidjs/router";
import {
  For,
  Match,
  Show,
  Switch,
  createContext,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type Accessor,
  type JSX,
} from "solid-js";
import { BotonTema } from "~/components/ui/BotonTema";
import { Seo } from "~/components/ui/Seo";
import { PANEL_ENABLED } from "~/lib/panel";
import {
  ErrorPanel,
  PERSONAS,
  entrar,
  nombreDeRol,
  perfilActual,
  salir,
  type Perfil,
  type Persona,
} from "~/lib/panel/nube";
import { SUPABASE_LISTO, panel } from "~/lib/supabase";

interface SesionPanel {
  perfil: Accessor<Perfil>;
  esAdmin: () => boolean;
}

const Sesion = createContext<SesionPanel>();

/** Quién tiene la sesión abierta en el panel. Solo existe dentro de `PanelShell`. */
export function useSesion(): SesionPanel {
  const sesion = useContext(Sesion);
  if (!sesion) throw new Error("useSesion fuera de PanelShell");
  return sesion;
}

function Entrar(props: { onEntrar: () => void; aviso: string | null }) {
  const [persona, setPersona] = createSignal<Persona | null>(null);
  const [pin, setPin] = createSignal("");
  const [error, setError] = createSignal<string | null>(props.aviso);
  const [enviando, setEnviando] = createSignal(false);
  let campo: HTMLInputElement | undefined;

  const elegir = (p: Persona) => {
    setPersona(p);
    setPin("");
    setError(null);
    queueMicrotask(() => campo?.focus());
  };

  const enviar = async (e: SubmitEvent) => {
    e.preventDefault();
    const p = persona();
    if (!p || enviando()) return;
    setEnviando(true);
    setError(null);
    try {
      await entrar(p, pin());
      props.onEntrar();
    } catch (err) {
      setError(err instanceof ErrorPanel ? err.message : "No se pudo entrar. Inténtalo de nuevo.");
      setPin("");
      campo?.focus();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main class="relative flex min-h-dvh items-center justify-center bg-fondo px-4 py-12">
      <BotonTema class="absolute right-4 top-4" />
      <div class="flex w-full max-w-[460px] flex-col gap-8">
        <div class="flex flex-col gap-2 text-center">
          <p class="m-0 text-[11px] font-bold uppercase tracking-[0.28em] text-acento">
            Editorial Huapango
          </p>
          <h1 class="m-0 font-serif text-4xl font-light tracking-tight">Panel de la editorial</h1>
          <p class="m-0 text-[15px] text-tinta-suave">¿Quién eres?</p>
        </div>

        <div class="grid grid-cols-2 gap-3" role="group" aria-label="Elige tu cuenta">
          <For each={PERSONAS}>
            {(p) => (
              <button
                type="button"
                onClick={() => elegir(p)}
                aria-pressed={persona()?.id === p.id}
                class="flex flex-col items-start gap-1 rounded-sm border p-4 text-left transition-colors"
                classList={{
                  "border-acento-borde bg-acento-fondo/15": persona()?.id === p.id,
                  "border-linea-fuerte hover:border-borde-hover": persona()?.id !== p.id,
                }}
              >
                <span class="font-serif text-xl text-tinta">{p.nombre}</span>
                <span class="text-[13px] text-tinta-suave">{p.puesto}</span>
              </button>
            )}
          </For>
        </div>

        <Show when={persona()}>
          {(p) => (
            <form onSubmit={enviar} class="flex flex-col gap-3" noValidate>
              <label for="pin" class="text-[13px] font-semibold text-tinta-2">
                PIN de {p().nombre}
              </label>
              <input
                ref={campo}
                id="pin"
                type="password"
                inputmode="numeric"
                autocomplete="current-password"
                maxlength="12"
                value={pin()}
                onInput={(e) => setPin(e.currentTarget.value.replace(/\D/g, ""))}
                class="h-14 rounded-sm border border-linea-fuerte bg-superficie px-4 text-center font-mono text-2xl tracking-[0.5em] text-tinta focus:border-acento-borde focus:outline-none"
                aria-describedby={error() ? "pin-error" : undefined}
              />
              <button
                type="submit"
                disabled={enviando() || pin().length < 6}
                class="h-12 rounded-sm bg-acento-fondo text-sm font-semibold text-white hover:bg-acento-fondo-hover disabled:opacity-40"
              >
                {enviando() ? "Entrando…" : "Entrar"}
              </button>
            </form>
          )}
        </Show>

        <Show when={error()}>
          {(m) => (
            <p
              id="pin-error"
              role="alert"
              class="m-0 rounded-sm border border-error px-4 py-3 text-center text-sm text-acento"
            >
              {m()}
            </p>
          )}
        </Show>
      </div>
    </main>
  );
}

/**
 * Marco del panel de la editorial. Pide entrar con PIN (ADR 0021) y da la sesión a sus pantallas.
 * Fuera de desarrollo o de un build con el panel encendido responde 404 (ver `lib/panel.ts`).
 */
export function PanelShell(props: { title: string; path: string; children: JSX.Element }) {
  const [perfil, setPerfil] = createSignal<Perfil | null>(null);
  const [estado, setEstado] = createSignal<"cargando" | "fuera" | "dentro">("cargando");
  const [aviso, setAviso] = createSignal<string | null>(null);

  const revisar = async () => {
    try {
      const p = await perfilActual();
      if (p) {
        setPerfil(p);
        setEstado("dentro");
        return;
      }
      const { data } = await panel().auth.getSession();
      if (data.session) {
        await salir();
        setAviso("Esta cuenta no tiene acceso al panel.");
      }
    } catch (error) {
      setAviso(error instanceof ErrorPanel ? error.message : "No se pudo revisar tu sesión.");
    }
    setPerfil(null);
    setEstado("fuera");
  };

  onMount(() => {
    if (!PANEL_ENABLED || !SUPABASE_LISTO) return;
    void revisar();
    const { data } = panel().auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") {
        setPerfil(null);
        setEstado("fuera");
      }
    });
    onCleanup(() => data.subscription.unsubscribe());
  });

  const cerrar = async () => {
    await salir();
    setAviso(null);
  };

  return (
    <Show
      when={PANEL_ENABLED}
      fallback={
        <>
          <HttpStatusCode code={404} />
          <Seo
            title="No encontrado · Huapango +reads"
            description="No existe."
            path={props.path}
            noindex
          />
          <main class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
            <h1 class="font-serif text-4xl font-light">No encontramos esta página</h1>
            <A href="/" class="text-acento">
              Volver al catálogo
            </A>
          </main>
        </>
      }
    >
      <Seo
        title={`${props.title} · Panel · Huapango +reads`}
        description="Panel de la editorial."
        path={props.path}
        noindex
      />
      <Switch>
        <Match when={!SUPABASE_LISTO}>
          <main class="flex min-h-dvh items-center justify-center bg-fondo px-6 text-center">
            <p class="max-w-[520px] font-serif text-xl text-tinta-2">
              El panel no está conectado a la base de datos en esta versión.
            </p>
          </main>
        </Match>
        <Match when={estado() === "cargando"}>
          <main class="flex min-h-dvh items-center justify-center bg-fondo">
            <p class="font-serif text-xl text-tinta-2" aria-live="polite">
              Abriendo el panel…
            </p>
          </main>
        </Match>
        <Match when={estado() === "fuera"}>
          <Entrar onEntrar={() => void revisar()} aviso={aviso()} />
        </Match>
        <Match when={estado() === "dentro" && perfil()}>
          {(p) => (
            <Sesion.Provider value={{ perfil: p, esAdmin: () => p().rol === "admin" }}>
              <div class="flex min-h-dvh flex-col bg-fondo text-tinta">
                <header class="border-b border-linea bg-fondo-hondo">
                  <div class="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-8">
                    <nav aria-label="Panel" class="flex items-center gap-5 text-sm">
                      <A
                        href="/panel"
                        class="flex items-baseline gap-2 font-serif text-lg text-tinta no-underline"
                      >
                        Panel
                        <span class="hidden font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-acento sm:inline">
                          Editorial Huapango
                        </span>
                      </A>
                      <A
                        href="/panel/importar"
                        class="text-tinta-suave no-underline hover:text-tinta"
                      >
                        Importar
                      </A>
                      <A href="/" class="text-tinta-suave no-underline hover:text-tinta">
                        Ver el sitio
                      </A>
                    </nav>
                    <div class="flex items-center gap-3 text-sm">
                      <BotonTema />
                      <span class="hidden text-right leading-tight sm:block">
                        <span class="block text-tinta">{p().nombre}</span>
                        <span class="block text-[11px] text-tinta-tenue">
                          {nombreDeRol(p().rol)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void cerrar()}
                        class="rounded-sm border border-linea-fuerte px-3 py-1.5 text-[13px] text-tinta-2 hover:border-borde-hover"
                      >
                        Salir
                      </button>
                    </div>
                  </div>
                </header>
                {props.children}
              </div>
            </Sesion.Provider>
          )}
        </Match>
      </Switch>
    </Show>
  );
}
