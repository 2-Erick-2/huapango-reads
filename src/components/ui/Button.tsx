import { A } from "@solidjs/router";
import { splitProps, type JSX } from "solid-js";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex h-12 items-center justify-center gap-2.5 rounded-sm px-7 text-[13px] font-semibold uppercase tracking-[0.16em] no-underline transition-colors";

const variants: Record<Variant, string> = {
  primary: "bg-terregal-600 text-white hover:bg-terregal-700",
  secondary: "bg-carbon-700 text-bond-100 hover:bg-carbon-600",
  ghost: "border border-carbon-700 text-bond-300 hover:border-carbon-400",
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
      class={`${base} ${variants[local.variant ?? "primary"]} disabled:cursor-not-allowed disabled:bg-carbon-700 disabled:text-carbon-300 ${local.class ?? ""}`}
    >
      {local.children}
    </button>
  );
}
