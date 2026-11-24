import { For, createUniqueId } from "solid-js";
import { starKinds, type StarKind } from "~/lib/club";

const STAR = "M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.2 1.2-6.5L2.5 9.5l6.6-.9z";

function Star(props: { kind: StarKind; size: number }) {
  const clip = createUniqueId();
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
      </defs>
      <path
        d={STAR}
        fill={props.kind === "full" ? "#D4A359" : "none"}
        stroke={props.kind === "empty" ? "#74736C" : "#D4A359"}
        stroke-width="1.2"
        stroke-linejoin="round"
      />
      {props.kind === "half" && <path d={STAR} fill="#D4A359" clip-path={`url(#${clip})`} />}
    </svg>
  );
}

/** Calificación con medias estrellas. El texto para lectores de pantalla va en `aria-label`. */
export function Stars(props: { rating: number; size?: number }) {
  return (
    <span class="flex gap-0.5" role="img" aria-label={`${props.rating} de 5 estrellas`}>
      <For each={starKinds(props.rating)}>
        {(kind) => <Star kind={kind} size={props.size ?? 16} />}
      </For>
    </span>
  );
}
