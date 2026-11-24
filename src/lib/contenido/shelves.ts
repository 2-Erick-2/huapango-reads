/**
 * Estantes del inicio que salen del contenido real: "Ensayos" (obras de una sola pieza, de acceso libre) y
 * "Continúa leyendo" (avance guardado en este dispositivo). Lógica pura para poder probarla.
 */
import { BOOKS } from "~/lib/catalog/data";
import type { Book } from "~/lib/catalog/types";
import type { Manifest, PiezaKind } from "~/lib/libro/types";
import { MANIFESTS } from "./manifests.generated";

export interface ShelfItem {
  obra: string;
  slug: string;
  title: string;
  /** Título del libro al que pertenece */
  bookTitle: string;
  /** El libro de la obra, si está en el catálogo (para su portada) */
  book: Book | undefined;
  credit: string | null;
  /** Resumen de la obra (los ensayos lo traen en su manifiesto) */
  summary: string | null;
  minutes: number;
  kind: PiezaKind;
  /** Avance 0..1 (solo en "Continúa leyendo") */
  progress: number | null;
}

function allItems(manifests: Readonly<Record<string, Manifest>> = MANIFESTS): ShelfItem[] {
  return Object.entries(manifests).flatMap(([obra, manifest]) => {
    const book = BOOKS.find((b) => b.read?.obra === obra);
    const bookTitle = book?.title ?? manifest.pieces.find((p) => p.kind === "libro")?.title ?? obra;
    return manifest.pieces.map((p) => ({
      obra,
      slug: p.slug,
      title: p.title,
      bookTitle,
      book,
      credit: p.credit,
      summary: manifest.summary ?? null,
      minutes: p.stats.minutes,
      kind: p.kind,
      progress: null,
    }));
  });
}

/** Ensayos publicados (acceso libre), en el orden del manifiesto: primero los más recientes de la lista. */
export function essays(manifests: Readonly<Record<string, Manifest>> = MANIFESTS): ShelfItem[] {
  return allItems(manifests).filter((i) => i.kind === "ensayo");
}

/**
 * Piezas empezadas y no terminadas, según el avance guardado. Las más avanzadas primero.
 * `load` devuelve el avance 0..1 de una pieza (o null si no hay).
 */
export function inProgress(load: (slug: string) => number | null): ShelfItem[] {
  return allItems()
    .map((i) => ({ ...i, progress: load(i.slug) }))
    .filter((i) => i.progress !== null && i.progress > 0 && i.progress < 1)
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
}
