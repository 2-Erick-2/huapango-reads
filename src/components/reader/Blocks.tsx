import { For, Match, Show, Switch, type JSX } from "solid-js";
import type { Align, Block, ImageBlock, Inline } from "~/lib/libro/types";
import type { THEMES } from "~/lib/reader/types";

type Theme = (typeof THEMES)[keyof typeof THEMES];

/** Texto en línea con énfasis (cursiva, negrita, versalitas). */
export function Inlines(props: { nodes: readonly Inline[] }): JSX.Element {
  return (
    <For each={props.nodes}>
      {(node) => {
        if (typeof node === "string") return node;
        if ("em" in node) {
          return (
            <em>
              <Inlines nodes={node.em} />
            </em>
          );
        }
        if ("strong" in node) {
          return (
            <strong>
              <Inlines nodes={node.strong} />
            </strong>
          );
        }
        return (
          <span style={{ "font-variant-caps": "small-caps", "letter-spacing": "0.04em" }}>
            <Inlines nodes={node.smallCaps} />
          </span>
        );
      }}
    </For>
  );
}

const TEXT_ALIGN: Record<Align, "left" | "center" | "right" | "justify"> = {
  start: "left",
  center: "center",
  end: "right",
  justify: "justify",
};

export interface BlockViewProps {
  block: Block;
  theme: Theme;
  /** Tema oscuro: los adornos son negros sobre transparente y se invierten para que se vean */
  dark: boolean;
  /** URL pública de un asset de la pieza */
  assetUrl: (name: string) => string;
  /** Alto máximo de una imagen dentro de una página, en px */
  maxImageHeight: number;
  /** Salto de columna después de este bloque (cierre de portadilla a página completa) */
  breakAfter?: boolean;
}

/**
 * Un bloque del formato canónico, listo para fluir en las columnas del lector.
 * Todo se expresa en `em` para que escale con el tamaño de letra (A− / A+).
 */
export function BlockView(props: BlockViewProps): JSX.Element {
  return (
    <Switch>
      <Match when={props.block.type === "heading" && props.block}>
        {(b) => (
          <Heading level={b().level} id={b().id} nodes={b().text} accent={props.theme.accent} />
        )}
      </Match>

      <Match when={props.block.type === "paragraph" && props.block}>
        {(b) => (
          <p
            id={b().id}
            data-page={b().page ?? undefined}
            class="m-0"
            classList={{ "drop-cap": b().dropCap }}
            style={{
              // La sangría es de la prosa: un texto centrado o a la derecha nunca la lleva.
              "text-indent":
                b().indent && (b().align === "justify" || b().align === "start") ? "1.5em" : "0",
              "text-align": TEXT_ALIGN[b().align],
              hyphens: "auto",
              orphans: 2,
              widows: 2,
            }}
          >
            <Inlines nodes={b().text} />
          </p>
        )}
      </Match>

      <Match when={props.block.type === "byline" && props.block}>
        {(b) => (
          <p
            id={b().id}
            class="m-0 text-right"
            style={{
              "margin-top": "1.1em",
              "break-inside": "avoid",
              ...(props.breakAfter ? { "break-after": "column" } : {}),
            }}
          >
            <span class="italic">
              <Inlines nodes={b().text} />
            </span>
            <Show when={b().credit}>
              <br />
              <span style={{ color: props.theme.muted, "font-size": "0.82em" }}>{b().credit}</span>
            </Show>
          </p>
        )}
      </Match>

      <Match when={props.block.type === "image" && props.block}>
        {(b) => (
          <ImageFigure
            block={b()}
            theme={props.theme}
            dark={props.dark}
            assetUrl={props.assetUrl}
            maxImageHeight={props.maxImageHeight}
          />
        )}
      </Match>

      <Match when={props.block.type === "spacer"}>
        <div aria-hidden="true" style={{ height: "1.7em" }} />
      </Match>

      <Match when={props.block.type === "ornament" && props.block}>
        {(b) => (
          <p
            id={b().id}
            class="m-0 text-center"
            style={{
              "margin-top": "2.2em",
              "font-size": "0.85em",
              "letter-spacing": "0.45em",
              color: props.theme.muted,
              "break-inside": "avoid",
            }}
          >
            {b().text}
          </p>
        )}
      </Match>
    </Switch>
  );
}

function Heading(props: {
  level: 1 | 2 | 3;
  id: string;
  nodes: readonly Inline[];
  accent: string;
}) {
  return (
    <Show
      when={props.level < 3}
      fallback={
        <p
          id={props.id}
          class="m-0 text-center font-sans font-bold uppercase"
          style={{
            color: props.accent,
            "font-size": "0.58em",
            "letter-spacing": "0.3em",
            "margin-top": "2.4em",
            "break-after": "avoid",
          }}
        >
          <Inlines nodes={props.nodes} />
        </p>
      }
    >
      <h2
        id={props.id}
        data-section={props.id}
        class="m-0 text-center font-normal leading-tight"
        classList={{ "font-display": props.level === 1 }}
        style={{
          "font-size": props.level === 1 ? "2.6em" : "1.4em",
          margin: props.level === 1 ? "0.45em 0 0.55em" : "1.1em 0 1.1em",
          "break-after": "avoid",
        }}
      >
        <Inlines nodes={props.nodes} />
      </h2>
    </Show>
  );
}

function ImageFigure(props: Omit<BlockViewProps, "block"> & { block: ImageBlock }) {
  const portadilla = () => props.block.role === "portadilla";
  const widthPct = () => (portadilla() ? 100 : (props.block.widthPct ?? 100));

  // Los adornos y viñetas son negros sobre blanco (algunos JPG sin transparencia). En tema claro se
  // mezclan con "multiply" para que el blanco desaparezca contra el papel; en tema oscuro se invierten
  // y se mezclan con "screen". La acuarela de portadilla conserva sus colores sobre papel.
  const tone = (): JSX.CSSProperties => {
    if (portadilla()) {
      return {
        background: props.dark ? "#FDFBF7" : "transparent",
        "border-radius": "2px",
      };
    }
    return props.dark
      ? { filter: "invert(1)", "mix-blend-mode": "screen" }
      : { "mix-blend-mode": "multiply" };
  };

  return (
    <figure
      class="m-0 text-center"
      style={{
        margin: portadilla() ? "0 0 1.2em" : "1.3em 0",
        "break-inside": "avoid",
        // Un adorno o una viñeta nunca debe quedar solo al final de una página.
        "break-after": portadilla() ? "auto" : "avoid",
      }}
    >
      <Show
        when={props.block.crop}
        fallback={
          <img
            src={props.assetUrl(props.block.asset)}
            alt={props.block.alt}
            width={props.block.width}
            height={props.block.height}
            loading="eager"
            decoding="async"
            draggable={false}
            style={{
              display: "inline-block",
              width: `${widthPct()}%`,
              height: "auto",
              "max-width": "100%",
              "max-height": `${portadilla() ? Math.round(props.maxImageHeight * 0.65) : props.maxImageHeight}px`,
              "object-fit": "contain",
              ...tone(),
            }}
          />
        }
      >
        {(crop) => {
          // Se muestra solo una banda horizontal de la imagen (p. ej. los pájaros de una tarjeta de
          // capítulo, sin el título horneado en la imagen). La caja conserva la proporción de la banda.
          const span = () => crop().to - crop().from;
          return (
            <div
              aria-hidden="true"
              style={{
                display: "inline-block",
                position: "relative",
                overflow: "hidden",
                width: `${widthPct()}%`,
                "max-width": "100%",
                "aspect-ratio": `${props.block.width} / ${props.block.height * span()}`,
              }}
            >
              <img
                src={props.assetUrl(props.block.asset)}
                alt=""
                width={props.block.width}
                height={props.block.height}
                loading="eager"
                decoding="async"
                draggable={false}
                style={{
                  position: "absolute",
                  left: "0",
                  width: "100%",
                  height: `${100 / span()}%`,
                  top: `${-(crop().from / span()) * 100}%`,
                  ...tone(),
                }}
              />
            </div>
          );
        }}
      </Show>
    </figure>
  );
}
