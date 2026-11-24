import {
  FONTS,
  FONT_SIZE,
  LEADING,
  THEMES,
  type ReaderFont,
  type ReaderLeading,
  type ReaderSettings,
  type ReaderTheme,
} from "./types";

const KEY = "hr:reader:settings";
export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "bond",
  fontSize: FONT_SIZE.default,
  font: "serif",
  leading: "normal",
};

const isTheme = (v: unknown): v is ReaderTheme => typeof v === "string" && v in THEMES;
const isFont = (v: unknown): v is ReaderFont => typeof v === "string" && v in FONTS;
const isLeading = (v: unknown): v is ReaderLeading => typeof v === "string" && v in LEADING;

/**
 * Normaliza preferencias guardadas: acepta lo que sirva, descarta lo demás y rellena con los valores
 * por omisión. Así un dato viejo o dañado en localStorage nunca rompe el lector.
 */
export function parseSettings(raw: unknown): ReaderSettings {
  const p = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    theme: isTheme(p["theme"]) ? p["theme"] : DEFAULT_SETTINGS.theme,
    fontSize:
      typeof p["fontSize"] === "number" && Number.isFinite(p["fontSize"])
        ? Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, Math.round(p["fontSize"])))
        : DEFAULT_SETTINGS.fontSize,
    font: isFont(p["font"]) ? p["font"] : DEFAULT_SETTINGS.font,
    leading: isLeading(p["leading"]) ? p["leading"] : DEFAULT_SETTINGS.leading,
  };
}

/**
 * Preferencias del lector en localStorage (conveniencia por dispositivo; en el Hito 2 se sincronizan a
 * la cuenta). Sin preferencias guardadas, la página toma el tema que corresponde al modo del sitio
 * (`temaInicial`: día → bond, noche → carbón); después manda lo que elija la persona.
 */
export function loadSettings(temaInicial: ReaderTheme = DEFAULT_SETTINGS.theme): ReaderSettings {
  const inicial = { ...DEFAULT_SETTINGS, theme: temaInicial };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseSettings(JSON.parse(raw)) : inicial;
  } catch {
    return inicial;
  }
}

export function saveSettings(settings: ReaderSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // modo privado o almacenamiento bloqueado: el lector funciona igual
  }
}
