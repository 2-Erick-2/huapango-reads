/** Contenido estructurado que consume el lector. En el Hito 2 saldrá del proceso Word → EPUB. */
export interface Chapter {
  id: string;
  /** "Capítulo I" */
  label: string;
  title: string;
  paragraphs: string[];
}

export interface ReadableText {
  id: string;
  title: string;
  /** Aviso visible de qué es este texto (p. ej. "Texto de demostración") */
  notice: string;
  chapters: Chapter[];
}

export type ReaderTheme = "bond" | "sepia" | "carbon";
export type ReaderFont = "serif" | "sans";
export type ReaderLeading = "compact" | "normal" | "wide";

export interface ReaderSettings {
  theme: ReaderTheme;
  /** px */
  fontSize: number;
  font: ReaderFont;
  leading: ReaderLeading;
}

/** `accent`: color de títulos de capítulo con contraste AA sobre el fondo del tema */
export const THEMES: Record<
  ReaderTheme,
  { name: string; bg: string; fg: string; muted: string; accent: string }
> = {
  bond: { name: "Bond", bg: "#FDFBF7", fg: "#141413", muted: "#5A5953", accent: "#A3452B" },
  sepia: { name: "Sepia", bg: "#F4ECD8", fg: "#403020", muted: "#6B5A45", accent: "#A3452B" },
  carbon: { name: "Carbón", bg: "#1C1C1A", fg: "#EADFCF", muted: "#ABA9A0", accent: "#D66E53" },
};

export const FONTS: Record<ReaderFont, { name: string; hint: string; family: string }> = {
  serif: { name: "Newsreader", hint: "Predeterminada", family: "var(--font-serif)" },
  sans: { name: "Sans", hint: "Más neutra", family: "var(--font-sans)" },
};

export const LEADING: Record<ReaderLeading, { name: string; value: number }> = {
  compact: { name: "Compacto", value: 1.5 },
  normal: { name: "Normal", value: 1.7 },
  wide: { name: "Amplio", value: 1.95 },
};

export const FONT_SIZE = { min: 15, max: 26, default: 19 } as const;
