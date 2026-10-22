import { FONT_SIZE, THEMES, type ReaderSettings } from "./types";

const KEY = "hr:reader:settings";
export const DEFAULT_SETTINGS: ReaderSettings = { theme: "bond", fontSize: FONT_SIZE.default };

/** Preferencias del lector en localStorage (conveniencia por dispositivo; en el Hito 2 se sincronizan a la cuenta). */
export function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    return {
      theme: parsed.theme && parsed.theme in THEMES ? parsed.theme : DEFAULT_SETTINGS.theme,
      fontSize:
        typeof parsed.fontSize === "number"
          ? Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, parsed.fontSize))
          : DEFAULT_SETTINGS.fontSize,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ReaderSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // modo privado o almacenamiento bloqueado: el lector funciona igual
  }
}
