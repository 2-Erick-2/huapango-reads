import { A } from "@solidjs/router";
import { Show } from "solid-js";

/**
 * Pieza de un libro (prólogo, nota, epílogo…) como minilibro de papel con su listón negro, como en
 * el diseño aprobado. El listón dice el tipo de pieza en una palabra ("prólogo", "nota").
 */
export function PiezaCard(props: {
  href: string;
  tag: string;
  title: string;
  credit: string | null;
  minutes?: number | null;
}) {
  return (
    <A href={props.href} class="group flex w-full max-w-[340px] items-center gap-5 no-underline">
      <div class="book-spine relative h-[144px] w-[100px] shrink-0 overflow-hidden rounded-sm bg-papel shadow-book transition-transform duration-300 group-hover:-translate-y-1 md:h-[162px] md:w-[112px]">
        <span class="absolute right-2 top-2 font-serif text-[12px] italic text-papel-acento">
          +reads
        </span>
        <span class="absolute inset-x-0 top-[56px] flex h-[26px] items-center justify-center bg-liston text-[11.5px] font-semibold tracking-wide text-liston-tinta md:top-[64px] md:h-[30px] md:text-[12.5px]">
          {props.tag}
        </span>
        <Show when={props.credit}>
          <span class="absolute inset-x-2 top-[92px] text-center font-serif text-[11px] italic leading-tight text-papel-tinta md:top-[104px] md:text-xs">
            {props.credit}
          </span>
        </Show>
      </div>
      <span class="flex min-w-0 flex-col gap-1.5">
        <span class="text-xs font-bold uppercase tracking-[0.16em] text-tinta">{props.title}</span>
        <Show when={props.minutes !== null && props.minutes !== undefined}>
          <span class="text-xs text-tinta-tenue">{props.minutes} min de lectura</span>
        </Show>
      </span>
    </A>
  );
}
