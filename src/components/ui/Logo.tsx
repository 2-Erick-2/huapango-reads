import { A } from "@solidjs/router";

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
        src="/brand/logo-huapango-claro.svg"
        alt=""
        width="484"
        height="114"
        class={small() ? "h-5 w-auto" : "h-[26px] w-auto"}
      />
      <span
        class={`font-serif italic leading-none text-terregal-400 ${small() ? "text-xl" : "text-[26px]"}`}
        aria-hidden="true"
      >
        +reads
      </span>
    </A>
  );
}
