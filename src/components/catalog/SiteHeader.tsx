import { A, useLocation } from "@solidjs/router";
import { For, Show, createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import { BotonTema } from "~/components/ui/BotonTema";
import { estadoCuenta, iniciarCuentaLector } from "~/lib/lector/cuenta";
import { Logo } from "../ui/Logo";

const ENLACES = [
  { href: "/", texto: "Inicio", exacto: true },
  { href: "/#raices", texto: "Colecciones", exacto: false },
  { href: "/#proximamente", texto: "Próximamente", exacto: false },
  { href: "/biblioteca", texto: "Mi biblioteca", exacto: false },
] as const;

function IconoMenu(props: { abierto: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <Show when={props.abierto} fallback={<path d="M4 7h16M4 12h16M4 17h16" />}>
        <path d="M6 6l12 12M18 6L6 18" />
      </Show>
    </svg>
  );
}

/**
 * Encabezado fijo del catálogo con navegación adaptable, biblioteca y estado de cuenta.
 * En pantallas chicas los enlaces van dentro de un menú hamburguesa (se cierra al elegir, al tocar
 * fuera o con Escape).
 */
export function SiteHeader() {
  const [menu, setMenu] = createSignal(false);
  const location = useLocation();
  let raiz!: HTMLElement;
  let boton!: HTMLButtonElement;

  onMount(() => {
    iniciarCuentaLector();
    const fuera = (e: PointerEvent) => {
      if (menu() && !raiz.contains(e.target as Node)) setMenu(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menu()) {
        setMenu(false);
        boton.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    onCleanup(() => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    });
  });
  // Al cambiar de página (o de sección con #), el menú se cierra solo
  createEffect(
    on(
      () => location.pathname + location.hash,
      () => setMenu(false),
      { defer: true },
    ),
  );

  const primerNombre = () => {
    const nombre = estadoCuenta().lector?.nombre?.trim() ?? "";
    return nombre.split(/\s+/)[0] || "Mi cuenta";
  };

  return (
    <header ref={raiz} class="sticky top-0 z-30 border-b border-linea bg-fondo/90 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-2 px-4 sm:h-[72px] sm:gap-6 sm:px-10">
        <div class="shrink-0">
          <Logo />
        </div>
        <nav
          aria-label="Principal"
          class="hidden items-center gap-7 text-sm font-medium lg:flex xl:gap-8"
        >
          <For each={ENLACES}>
            {(e) => (
              <A
                href={e.href}
                end={e.exacto}
                class="whitespace-nowrap text-tinta-suave no-underline hover:text-tinta"
                activeClass={e.href.includes("#") ? undefined : "!text-tinta"}
              >
                {e.texto}
              </A>
            )}
          </For>
        </nav>
        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <BotonTema />
          <button
            ref={boton}
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-linea-fuerte text-tinta-2 transition-colors hover:border-borde-hover hover:text-tinta lg:hidden"
            aria-expanded={menu()}
            aria-controls="menu-principal"
            aria-label={menu() ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenu((v) => !v)}
          >
            <IconoMenu abierto={menu()} />
          </button>
          <Show
            when={estadoCuenta().modo === "sesion"}
            fallback={
              <Show
                when={estadoCuenta().modo === "invitado"}
                fallback={
                  <A
                    href="/entrar"
                    class="inline-flex h-10 items-center justify-center rounded-sm border border-acento-tenue-borde bg-acento-tenue/60 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-acento no-underline transition-colors hover:bg-acento-tenue sm:px-4"
                  >
                    Entrar
                  </A>
                }
              >
                <A
                  href="/entrar"
                  title="Navegando en modo invitado"
                  class="inline-flex h-10 items-center gap-1.5 rounded-sm border border-aviso-borde bg-superficie px-2.5 text-xs font-medium text-tinta-2 sm:px-3 no-underline transition-colors hover:border-borde-hover"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-aviso" aria-hidden="true" />
                  Invitado
                </A>
              </Show>
            }
          >
            <A
              href="/biblioteca"
              class="inline-flex h-10 items-center gap-2 rounded-sm border border-linea-fuerte bg-superficie px-3 text-xs font-medium text-tinta no-underline transition-colors hover:border-borde-hover sm:px-3.5"
            >
              <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-acento-vivo" aria-hidden="true" />
              <span class="max-w-[72px] truncate sm:max-w-[140px]">{primerNombre()}</span>
            </A>
          </Show>
        </div>
      </div>
      <Show when={menu()}>
        <nav
          id="menu-principal"
          aria-label="Menú"
          class="absolute inset-x-0 top-full border-b border-linea bg-fondo shadow-[0_18px_30px_-18px_rgb(0_0_0/0.35)] lg:hidden"
        >
          <ul class="m-0 flex list-none flex-col px-4 py-2 sm:px-10">
            <For each={ENLACES}>
              {(e) => (
                <li class="border-b border-linea last:border-b-0">
                  <A
                    href={e.href}
                    end={e.exacto}
                    onClick={() => setMenu(false)}
                    class="flex min-h-12 items-center font-serif text-lg text-tinta-2 no-underline hover:text-tinta"
                    activeClass={e.href.includes("#") ? undefined : "!text-acento"}
                  >
                    {e.texto}
                  </A>
                </li>
              )}
            </For>
          </ul>
        </nav>
      </Show>
    </header>
  );
}
