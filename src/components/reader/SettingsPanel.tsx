import { For, type JSX } from "solid-js";
import {
  FONTS,
  FONT_SIZE,
  LEADING,
  THEMES,
  type ReaderFont,
  type ReaderLeading,
  type ReaderSettings,
  type ReaderTheme,
} from "~/lib/reader/types";

const GROUP_LABEL = "text-[11px] font-bold uppercase tracking-[0.24em] text-acento";
const BOX =
  "flex flex-1 items-center justify-center rounded-sm border text-[13px] font-semibold transition-colors";
const ON = "border-acento-borde bg-acento-fondo/20 text-tinta";
const OFF = "border-linea-fuerte text-tinta-2 hover:border-borde-hover";

function Group(props: { label: string; children: JSX.Element }) {
  return (
    <div class="flex flex-col gap-2.5">
      <span class={GROUP_LABEL}>{props.label}</span>
      {props.children}
    </div>
  );
}

/**
 * Ajustes de lectura (icono "Aa"): tamaño, tema, tipografía e interlineado, como en el diseño.
 * Es un panel de presentación: no guarda nada, solo avisa qué cambió.
 */
export function SettingsPanel(props: {
  settings: ReaderSettings;
  onFontSize: (delta: number) => void;
  onTheme: (theme: ReaderTheme) => void;
  onFont: (font: ReaderFont) => void;
  onLeading: (leading: ReaderLeading) => void;
}) {
  const steps = FONT_SIZE.max - FONT_SIZE.min;
  const at = () => ((props.settings.fontSize - FONT_SIZE.min) / steps) * 100;
  return (
    <div
      role="dialog"
      aria-label="Ajustes de lectura"
      class="absolute right-0 top-12 z-30 flex w-[344px] max-w-[calc(100vw-1.5rem)] flex-col gap-5 rounded-sm border border-linea-fuerte bg-superficie p-5 shadow-book"
    >
      <Group label="Tamaño de letra">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class={`${BOX} ${OFF} h-11 w-11 flex-none disabled:opacity-30`}
            aria-label="A− Reducir tamaño de letra"
            disabled={props.settings.fontSize <= FONT_SIZE.min}
            onClick={() => props.onFontSize(-1)}
          >
            A−
          </button>
          <div
            class="relative h-1 flex-1 rounded-full bg-control"
            role="img"
            aria-label={`Tamaño ${props.settings.fontSize} de ${FONT_SIZE.max}`}
          >
            <span
              class="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fondo bg-acento-vivo"
              style={{ left: `${at()}%` }}
            />
          </div>
          <button
            type="button"
            class={`${BOX} ${OFF} h-11 w-11 flex-none text-[17px] disabled:opacity-30`}
            aria-label="A+ Aumentar tamaño de letra"
            disabled={props.settings.fontSize >= FONT_SIZE.max}
            onClick={() => props.onFontSize(1)}
          >
            A+
          </button>
        </div>
      </Group>

      <Group label="Tema">
        <div role="radiogroup" aria-label="Tema de lectura" class="flex gap-2.5">
          <For each={Object.entries(THEMES) as Array<[ReaderTheme, (typeof THEMES)[ReaderTheme]]>}>
            {([key, t]) => (
              <button
                type="button"
                role="radio"
                aria-checked={props.settings.theme === key}
                aria-label={`Tema ${t.name}`}
                class={`${BOX} h-16 flex-col gap-1.5 ${props.settings.theme === key ? ON : OFF}`}
                onClick={() => props.onTheme(key)}
              >
                <span
                  class="h-6 w-6 rounded-full border border-borde-hover"
                  style={{ background: t.bg }}
                />
                {t.name}
              </button>
            )}
          </For>
        </div>
      </Group>

      <Group label="Tipografía">
        <div role="radiogroup" aria-label="Tipografía" class="flex flex-col gap-2">
          <For each={Object.entries(FONTS) as Array<[ReaderFont, (typeof FONTS)[ReaderFont]]>}>
            {([key, f]) => (
              <button
                type="button"
                role="radio"
                aria-checked={props.settings.font === key}
                class={`${BOX} h-12 justify-between px-3.5 ${props.settings.font === key ? ON : OFF}`}
                onClick={() => props.onFont(key)}
              >
                <span class="text-lg" style={{ "font-family": f.family }}>
                  {f.name}
                </span>
                <span class="text-[11.5px] font-normal text-tinta-suave">{f.hint}</span>
              </button>
            )}
          </For>
        </div>
      </Group>

      <Group label="Interlineado">
        <div role="radiogroup" aria-label="Interlineado" class="flex gap-2">
          <For
            each={
              Object.entries(LEADING) as Array<[ReaderLeading, (typeof LEADING)[ReaderLeading]]>
            }
          >
            {([key, l]) => (
              <button
                type="button"
                role="radio"
                aria-checked={props.settings.leading === key}
                class={`${BOX} h-11 ${props.settings.leading === key ? ON : OFF}`}
                onClick={() => props.onLeading(key)}
              >
                {l.name}
              </button>
            )}
          </For>
        </div>
      </Group>
    </div>
  );
}
