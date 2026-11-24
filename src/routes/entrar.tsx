import { A, useNavigate } from "@solidjs/router";
import { For, Show, createSignal, onMount } from "solid-js";
import { BookCover } from "~/components/catalog/BookCover";
import { SiteFooter } from "~/components/catalog/SiteFooter";
import { SiteHeader } from "~/components/catalog/SiteHeader";
import { Button, ButtonLink } from "~/components/ui/Button";
import { Seo } from "~/components/ui/Seo";
import { BOOKS } from "~/lib/catalog/data";
import {
  activarInvitado,
  entrarConClave,
  estadoCuenta,
  iniciarCuentaLector,
  registrarLector,
  salirCuenta,
} from "~/lib/lector/cuenta";

type Pestana = "entrar" | "registro";

const VITRINA = BOOKS.slice(0, 3);

export default function EntrarPage() {
  const navigate = useNavigate();
  onMount(() => iniciarCuentaLector());

  const [pestana, setPestana] = createSignal<Pestana>("entrar");
  const [nombre, setNombre] = createSignal("");
  const [correo, setCorreo] = createSignal("");
  const [clave, setClave] = createSignal("");
  const [verClave, setVerClave] = createSignal(false);
  const [enviando, setEnviando] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const cambiarPestana = (nueva: Pestana) => {
    setPestana(nueva);
    setError(null);
  };

  const manejarEnvio = async (e: Event) => {
    e.preventDefault();
    if (enviando()) return;
    setError(null);
    setEnviando(true);

    try {
      if (pestana() === "entrar") {
        const res = await entrarConClave(correo(), clave());
        if (!res.ok) {
          setError(res.error);
          return;
        }
        navigate("/", { replace: true });
        return;
      }

      const res = await registrarLector(nombre(), correo(), clave());
      if (!res.ok) {
        setError(res.error);
        return;
      }
      navigate("/", { replace: true });
    } finally {
      setEnviando(false);
    }
  };

  const elegirInvitado = () => {
    activarInvitado();
    navigate("/", { replace: true });
  };

  const encabezadoFormulario = () =>
    pestana() === "registro" ? "Abre tu biblioteca digital." : "Tu estante de lectura te espera.";

  return (
    <div class="flex min-h-screen flex-col">
      <Seo
        title="Acceso de lectores · Huapango +reads"
        description="Inicia sesión, crea tu cuenta o explora el catálogo literario de Editorial Huapango en modo invitado."
        path="/entrar"
        noindex
      />
      <SiteHeader />

      <main class="mx-auto w-full max-w-[1360px] flex-1 px-4 py-8 sm:px-10 md:py-14">
        <div class="grid gap-8 lg:grid-cols-12 lg:items-stretch lg:gap-12">
          {/* Columna de acceso: primero en móviles y tabletas para no desplazar */}
          <section
            aria-labelledby="acceso-titulo"
            class="order-1 flex flex-col justify-between gap-8 rounded-sm border border-linea-fuerte bg-superficie p-6 sm:p-8 lg:order-2 lg:col-span-5 lg:p-10"
          >
            <Show
              when={estadoCuenta().modo !== "sesion"}
              fallback={
                <div class="flex flex-col gap-6">
                  <p class="m-0 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.26em] text-acento">
                    <span class="h-px w-6 bg-acento-vivo" aria-hidden="true" />
                    Sesión activa
                  </p>
                  <h1
                    id="acceso-titulo"
                    class="m-0 font-serif text-[34px] font-light leading-[1.08] tracking-tight text-tinta"
                  >
                    Hola, {estadoCuenta().lector?.nombre}.
                  </h1>
                  <p class="m-0 text-sm leading-relaxed text-tinta-suave">
                    Entraste con{" "}
                    <span class="font-medium text-tinta">{estadoCuenta().lector?.correo}</span>. Tu
                    progreso de lectura se guarda en tu cuenta.
                  </p>
                  <div class="flex flex-col gap-3 pt-2">
                    <ButtonLink href="/biblioteca" class="w-full">
                      Ir a Mi biblioteca
                    </ButtonLink>
                    <ButtonLink href="/" variant="ghost" class="w-full">
                      Explorar catálogo
                    </ButtonLink>
                    <Button variant="secondary" onClick={() => void salirCuenta()} class="w-full">
                      Cerrar sesión
                    </Button>
                  </div>
                </div>
              }
            >
              <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-2.5">
                  <p class="m-0 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.26em] text-acento">
                    <span class="h-px w-6 bg-acento-vivo" aria-hidden="true" />
                    Lectores Huapango
                  </p>
                  <h1
                    id="acceso-titulo"
                    class="m-0 font-serif text-[32px] font-light leading-[1.06] tracking-tight text-tinta sm:text-[38px]"
                  >
                    {encabezadoFormulario()}
                  </h1>
                </div>

                {/* Pestañas editoriales sobrias */}
                <div
                  role="tablist"
                  aria-label="Modo de acceso"
                  class="grid grid-cols-2 border-b border-linea"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={pestana() === "entrar"}
                    onClick={() => cambiarPestana("entrar")}
                    class="-mb-px whitespace-nowrap border-b-2 px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.12em] transition-colors"
                    classList={{
                      "border-acento-vivo text-tinta": pestana() === "entrar",
                      "border-transparent text-tinta-tenue hover:text-tinta-2":
                        pestana() !== "entrar",
                    }}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={pestana() === "registro"}
                    onClick={() => cambiarPestana("registro")}
                    class="-mb-px whitespace-nowrap border-b-2 px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.12em] transition-colors"
                    classList={{
                      "border-acento-vivo text-tinta": pestana() === "registro",
                      "border-transparent text-tinta-tenue hover:text-tinta-2":
                        pestana() !== "registro",
                    }}
                  >
                    Registrarse
                  </button>
                </div>

                <form onSubmit={manejarEnvio} class="flex flex-col gap-4" novalidate>
                  <Show when={pestana() === "registro"}>
                    <label class="flex flex-col gap-1.5">
                      <span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-tinta-2">
                        Nombre completo
                      </span>
                      <input
                        type="text"
                        required
                        autocomplete="name"
                        value={nombre()}
                        onInput={(e) => setNombre(e.currentTarget.value)}
                        placeholder="Ej. Valeria Mendoza"
                        class="h-11 rounded-sm border border-borde bg-fondo px-3.5 text-sm text-tinta placeholder:text-tinta-tenue focus:border-acento-vivo focus:outline-none"
                      />
                    </label>
                  </Show>

                  <label class="flex flex-col gap-1.5">
                    <span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-tinta-2">
                      Correo electrónico
                    </span>
                    <input
                      type="email"
                      required
                      autocomplete="email"
                      value={correo()}
                      onInput={(e) => setCorreo(e.currentTarget.value)}
                      placeholder="tu@correo.com"
                      class="h-11 rounded-sm border border-borde bg-fondo px-3.5 text-sm text-tinta placeholder:text-tinta-tenue focus:border-acento-vivo focus:outline-none"
                    />
                  </label>

                  <label class="flex flex-col gap-1.5">
                    <span class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-tinta-2">
                      <span>Contraseña</span>
                      <Show when={pestana() === "registro"}>
                        <span class="font-normal normal-case tracking-normal text-tinta-tenue">
                          Mínimo 8 caracteres
                        </span>
                      </Show>
                    </span>
                    <div class="relative flex items-center">
                      <input
                        type={verClave() ? "text" : "password"}
                        required
                        minLength={pestana() === "registro" ? 8 : undefined}
                        autocomplete={
                          pestana() === "registro" ? "new-password" : "current-password"
                        }
                        value={clave()}
                        onInput={(e) => setClave(e.currentTarget.value)}
                        placeholder="••••••••"
                        class="h-11 w-full rounded-sm border border-borde bg-fondo pl-3.5 pr-20 text-sm text-tinta placeholder:text-tinta-tenue focus:border-acento-vivo focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setVerClave((v) => !v)}
                        class="absolute right-2 rounded-sm px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-tinta-suave hover:text-tinta"
                      >
                        {verClave() ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  </label>

                  <Show when={error()}>
                    {(msg) => (
                      <p
                        role="alert"
                        class="m-0 rounded-sm border border-error bg-superficie-2 px-3.5 py-2.5 text-xs leading-relaxed text-tinta"
                      >
                        {msg()}
                      </p>
                    )}
                  </Show>

                  <Button type="submit" disabled={enviando()} class="mt-1 w-full">
                    {enviando()
                      ? "Procesando…"
                      : pestana() === "registro"
                        ? "Crear mi cuenta"
                        : "Entrar al catálogo"}
                  </Button>
                </form>
              </div>

              <div class="flex flex-col gap-3 border-t border-linea pt-6">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-[0.22em] text-tinta-2">
                    Modo invitado
                  </span>
                  <span class="text-[11px] text-tinta-tenue">Sin registro</span>
                </div>
                <p class="m-0 text-xs leading-relaxed text-tinta-suave">
                  Explora muestras de lectura y ensayos completos al instante. Tu progreso queda
                  guardado únicamente en este navegador.
                </p>
                <Button variant="ghost" onClick={elegirInvitado} class="w-full">
                  Continuar como invitado
                </Button>
              </div>
            </Show>
          </section>

          {/* Columna literaria / vitrina editorial */}
          <aside class="textura-papel order-2 flex flex-col justify-between gap-10 rounded-sm border border-linea p-7 sm:p-10 lg:order-1 lg:col-span-7 lg:p-12">
            <div class="flex flex-col gap-5">
              <p class="m-0 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-acento">
                <span class="h-px w-8 bg-acento-vivo" aria-hidden="true" />
                Editorial Huapango · Colección digital
              </p>
              <blockquote class="m-0 max-w-[600px] font-serif text-[26px] font-light leading-[1.22] text-tinta sm:text-[34px]">
                «Habita un espíritu distinto al que normalmente habita en los bosques; su presencia
                se hace notoria entre las hojas y la penumbra.»
              </blockquote>
              <p class="m-0 text-xs font-medium uppercase tracking-[0.18em] text-tinta-tenue">
                Fragmento de <span class="italic text-tinta-2">Nahual</span> · Colección Gabinete
                Gótico
              </p>
            </div>

            {/* Trío físico de portadas sobre filete editorial */}
            <div class="flex flex-col gap-4">
              <div class="flex items-end justify-center gap-4 border-b border-linea pb-6 pt-2 sm:justify-start sm:gap-7">
                <For each={VITRINA}>
                  {(book, i) => (
                    <A
                      href={`/libro/${book.slug}`}
                      aria-label={`Ver ${book.title}`}
                      class="group block shrink-0 transition-transform duration-300 hover:-translate-y-1.5"
                      classList={{
                        "w-[88px] sm:w-[132px]": i() !== 1,
                        "w-[104px] sm:w-[154px]": i() === 1,
                      }}
                    >
                      <BookCover
                        book={book}
                        sizes="(min-width: 640px) 154px, 104px"
                        shadow={i() === 1 ? "hero" : "book"}
                      />
                    </A>
                  )}
                </For>
              </div>

              <dl class="m-0 grid gap-5 pt-2 sm:grid-cols-3">
                <div class="flex flex-col gap-1">
                  <dt class="text-[11px] font-bold uppercase tracking-[0.2em] text-acento">
                    Tu avance siempre contigo
                  </dt>
                  <dd class="m-0 text-xs leading-relaxed text-tinta-suave">
                    Sincroniza la página exacta entre teléfono, tableta y computadora.
                  </dd>
                </div>
                <div class="flex flex-col gap-1">
                  <dt class="text-[11px] font-bold uppercase tracking-[0.2em] text-acento">
                    Modo invitado libre
                  </dt>
                  <dd class="m-0 text-xs leading-relaxed text-tinta-suave">
                    Lee ensayos publicados y adelantos antes de abrir una cuenta.
                  </dd>
                </div>
                <div class="flex flex-col gap-1">
                  <dt class="text-[11px] font-bold uppercase tracking-[0.2em] text-acento">
                    Lectura en papel o noche
                  </dt>
                  <dd class="m-0 text-xs leading-relaxed text-tinta-suave">
                    Cambia entre pliego diurno y nocturno sin perder tu lugar.
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
