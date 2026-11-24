import { A } from "@solidjs/router";
import { Show, onMount } from "solid-js";
import { BotonTema } from "~/components/ui/BotonTema";
import { estadoCuenta, iniciarCuentaLector } from "~/lib/lector/cuenta";
import { Logo } from "../ui/Logo";

/** Encabezado fijo del catálogo con navegación adaptable, biblioteca y estado de cuenta. */
export function SiteHeader() {
  onMount(() => iniciarCuentaLector());

  const primerNombre = () => {
    const nombre = estadoCuenta().lector?.nombre?.trim() ?? "";
    return nombre.split(/\s+/)[0] || "Mi cuenta";
  };

  return (
    <header class="sticky top-0 z-30 border-b border-linea bg-fondo/90 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:h-[72px] sm:gap-6 sm:px-10">
        <div class="shrink-0">
          <Logo />
        </div>
        <nav
          aria-label="Principal"
          class="hidden items-center gap-7 text-sm font-medium lg:flex xl:gap-8"
        >
          <A
            href="/"
            end
            class="whitespace-nowrap text-tinta-suave no-underline hover:text-tinta"
            activeClass="!text-tinta"
          >
            Inicio
          </A>
          <A
            href="/#raices"
            class="whitespace-nowrap text-tinta-suave no-underline hover:text-tinta"
          >
            Colecciones
          </A>
          <A
            href="/#proximamente"
            class="whitespace-nowrap text-tinta-suave no-underline hover:text-tinta"
          >
            Próximamente
          </A>
          <A
            href="/biblioteca"
            class="whitespace-nowrap text-tinta-suave no-underline hover:text-tinta"
            activeClass="!text-tinta"
          >
            Mi biblioteca
          </A>
        </nav>
        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <BotonTema />
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
                  class="inline-flex h-10 items-center gap-1.5 rounded-sm border border-aviso-borde bg-superficie px-3 text-xs font-medium text-tinta-2 no-underline transition-colors hover:border-borde-hover"
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
              <span class="max-w-[92px] truncate sm:max-w-[140px]">{primerNombre()}</span>
            </A>
          </Show>
        </div>
      </div>
      <nav
        aria-label="Navegación móvil"
        class="flex items-center justify-between gap-3 border-t border-linea px-4 py-2 text-xs font-medium sm:px-10 lg:hidden"
      >
        <A
          href="/"
          end
          class="whitespace-nowrap text-tinta-suave no-underline hover:text-tinta"
          activeClass="!text-tinta"
        >
          Inicio
        </A>
        <A href="/#raices" class="whitespace-nowrap text-tinta-suave no-underline hover:text-tinta">
          Colecciones
        </A>
        <A
          href="/#proximamente"
          class="whitespace-nowrap text-tinta-suave no-underline hover:text-tinta"
        >
          Próximamente
        </A>
        <A
          href="/biblioteca"
          class="whitespace-nowrap text-tinta-suave no-underline hover:text-tinta"
          activeClass="!text-tinta"
        >
          Mi biblioteca
        </A>
      </nav>
    </header>
  );
}
