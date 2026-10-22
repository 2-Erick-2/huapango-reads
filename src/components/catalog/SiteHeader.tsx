import { A } from "@solidjs/router";
import { Logo } from "../ui/Logo";

/** Encabezado fijo del catálogo. "Mi biblioteca" y "Entrar" llegan en el Hito 2 (login). */
export function SiteHeader() {
  return (
    <header class="sticky top-0 z-30 border-b border-carbon-800 bg-carbon-900/90 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-6 px-4 sm:h-[72px] sm:px-10">
        <Logo />
        <nav aria-label="Principal" class="hidden items-center gap-8 text-sm font-medium md:flex">
          <A
            href="/"
            end
            class="text-carbon-300 no-underline hover:text-bond-100"
            activeClass="!text-bond-100"
          >
            Inicio
          </A>
          <a href="/#raices" class="text-carbon-300 no-underline hover:text-bond-100">
            Colecciones
          </a>
          <a href="/#proximamente" class="text-carbon-300 no-underline hover:text-bond-100">
            Próximamente
          </a>
          <span class="text-carbon-500" title="Disponible al iniciar sesión (próximamente)">
            Mi biblioteca
          </span>
        </nav>
        <span class="rounded-full border border-terregal-800 bg-terregal-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-terregal-400">
          Demo
        </span>
      </div>
    </header>
  );
}
