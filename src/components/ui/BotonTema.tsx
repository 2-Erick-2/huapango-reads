import { alternarTema } from "~/lib/tema";

/**
 * Botón sol / luna para cambiar entre modo día y noche (ADR 0022). El ícono lo decide el CSS
 * (variante `dia:`), así el servidor y el navegador pintan lo mismo y no hay saltos al cargar.
 */
export function BotonTema(props: { class?: string }) {
  return (
    <button
      type="button"
      onClick={() => alternarTema()}
      aria-label="Cambiar entre modo día y modo noche"
      title="Modo día / noche"
      data-testid="boton-tema"
      class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-linea-fuerte text-tinta-2 transition-colors hover:border-borde-hover hover:text-tinta ${props.class ?? ""}`}
    >
      {/* En noche se ofrece el sol (ir a día); en día, la luna (ir a noche) */}
      <svg
        class="dia:hidden"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
      </svg>
      <svg
        class="hidden dia:block"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
      </svg>
    </button>
  );
}
