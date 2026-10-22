/**
 * Paginación por columnas CSS (ADR 0005). Lógica pura para poder probarla sin navegador.
 *
 * El texto fluye en columnas de alto fijo; cada columna es una página. En escritorio se
 * muestran 2 columnas (pliego) y en pantallas angostas 1. Avanzar = desplazar el contenido
 * un "paso" horizontal (ancho visible + separación).
 */

/** Ancho mínimo del área de lectura para mostrar dos páginas a la vez */
export const SPREAD_MIN_WIDTH = 900;

export interface PageLayout {
  /** Columnas visibles a la vez: 1 (celular) o 2 (pliego) */
  columns: 1 | 2;
  /** Ancho de cada columna en px */
  columnWidth: number;
  /** Separación entre columnas en px (incluye márgenes interiores del pliego) */
  gap: number;
  /** Desplazamiento horizontal por pliego en px */
  step: number;
}

export function computeLayout(innerWidth: number, gap: number): PageLayout {
  const columns: 1 | 2 = innerWidth >= SPREAD_MIN_WIDTH ? 2 : 1;
  const columnWidth = Math.max(1, (innerWidth - gap * (columns - 1)) / columns);
  return { columns, columnWidth, gap, step: innerWidth + gap };
}

/** Total de columnas que ocupa el contenido, a partir de su scrollWidth medido */
export function countColumns(scrollWidth: number, layout: PageLayout): number {
  return Math.max(1, Math.round((scrollWidth + layout.gap) / (layout.columnWidth + layout.gap)));
}

/** Total de pliegos (pantallas) */
export function countSpreads(totalColumns: number, layout: PageLayout): number {
  return Math.max(1, Math.ceil(totalColumns / layout.columns));
}

/** Pliego en el que cae una columna dada */
export function spreadOfColumn(column: number, layout: PageLayout): number {
  return Math.floor(column / layout.columns);
}

/** Columna en la que empieza un elemento según su offsetLeft dentro del contenido */
export function columnOfOffset(offsetLeft: number, layout: PageLayout): number {
  return Math.floor((offsetLeft + 1) / (layout.columnWidth + layout.gap));
}

/** Conserva la posición de lectura (en proporción) cuando cambia el número de pliegos */
export function remapSpread(current: number, oldTotal: number, newTotal: number): number {
  if (oldTotal <= 1) return 0;
  const ratio = current / (oldTotal - 1);
  return Math.min(newTotal - 1, Math.max(0, Math.round(ratio * (newTotal - 1))));
}

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
