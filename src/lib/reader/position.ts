/**
 * Posición de lectura por pieza, como proporción 0..1 del recorrido. Se guarda como proporción (y no
 * como número de página) porque las páginas cambian con el tamaño de letra y la pantalla.
 * En el Hito 2 se anclará al bloque visible y se sincronizará a la cuenta.
 */
const KEY = (slug: string) => `hr:reader:pos:${slug}`;

type Store = Pick<Storage, "getItem" | "setItem">;

function defaultStore(): Store | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // almacenamiento bloqueado
  }
}

export function loadPosition(slug: string, store: Store | null = defaultStore()): number | null {
  try {
    const raw = store?.getItem(KEY(slug));
    if (raw === null || raw === undefined) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
  } catch {
    return null;
  }
}

export function savePosition(slug: string, ratio: number, store: Store | null = defaultStore()) {
  try {
    store?.setItem(KEY(slug), String(Math.min(1, Math.max(0, ratio))));
  } catch {
    // modo privado o cuota llena: el lector funciona igual, solo no recuerda la posición
  }
}

/** Posición como proporción del recorrido: 0 en el primer pliego y 1 en el último. */
export function ratioOf(spread: number, spreads: number): number {
  return spreads <= 1 ? 0 : Math.min(1, Math.max(0, spread / (spreads - 1)));
}

/** Pliego que corresponde a una proporción guardada. */
export function spreadOfRatio(ratio: number, spreads: number): number {
  return Math.min(spreads - 1, Math.max(0, Math.round(ratio * (spreads - 1))));
}

/** Minutos que faltan para terminar la pieza, según el progreso (0..1). Nunca baja de 0. */
export function minutesLeft(totalMinutes: number, ratio: number): number {
  return Math.max(0, Math.ceil(totalMinutes * (1 - ratio)));
}
