import { A } from "@solidjs/router";
import { splitProps, type JSX } from "solid-js";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex h-12 items-center justify-center gap-2.5 rounded-sm px-7 text-[13px] font-semibold uppercase tracking-[0.16em] no-underline transition-colors";

const variants: Record<Variant, string> = {
  primary: "bg-acento-fondo text-white hover:bg-acento-fondo-hover",
  secondary: "bg-control text-tinta hover:bg-control-fuerte",
  ghost: "border border-linea-fuerte text-tinta-2 hover:border-borde-hover",
};

/** Enlace con apariencia de botón (navegación) */
export function ButtonLink(props: {
  href: string;
  variant?: Variant;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <A
      href={props.href}
      class={`${base} ${variants[props.variant ?? "primary"]} ${props.class ?? ""}`}
    >
      {props.children}
    </A>
  );
}

/** Botón real (acciones). Deshabilitado se ve apagado y no engaña al usuario */
export function Button(props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const [local, rest] = splitProps(props, ["variant", "class", "children"]);
  return (
    <button
      type="button"
      {...rest}
      class={`${base} ${variants[local.variant ?? "primary"]} disabled:cursor-not-allowed disabled:bg-control disabled:text-tinta-suave ${local.class ?? ""}`}
    >
      {local.children}
    </button>
  );
}
