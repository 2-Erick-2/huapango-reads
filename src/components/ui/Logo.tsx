import { A } from "@solidjs/router";
import { asset } from "~/lib/site";

/** Logo "Huapango +reads": wordmark SVG de la editorial + "+reads" en Newsreader cursiva */
export function Logo(props: { size?: "sm" | "md" }) {
  const small = () => props.size === "sm";
  return (
    <A
      href="/"
      class="flex items-baseline gap-2 no-underline"
      aria-label="Huapango +reads, ir al inicio"
    >
      <img
        src={asset("/brand/logo-huapango-claro.svg")}
        alt=""
        width="484"
        height="114"
        class={`${small() ? "h-5" : "h-[20px] sm:h-[26px]"} w-auto dia:hidden`}
      />
      <img
        src={asset("/brand/logo-huapango.svg")}
        alt=""
        width="484"
        height="114"
        class={`${small() ? "h-5" : "h-[20px] sm:h-[26px]"} hidden w-auto dia:block`}
      />
      <span
        class={`font-serif italic leading-none text-acento ${small() ? "text-xl" : "text-[20px] sm:text-[26px]"}`}
        aria-hidden="true"
      >
        +reads
      </span>
    </A>
  );
}
