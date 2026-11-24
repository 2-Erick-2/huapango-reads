/**
 * Modelo del catálogo. Tiene la misma forma que tendrán las tablas de Supabase
 * (Hito 2), para que cambiar la fuente de datos no toque la UI.
 * `null` significa "por confirmar con la editorial": la UI lo muestra así, nunca inventa.
 */

export type CollectionSlug =
  "raices" | "cuentos-a-todas-partes" | "ecos" | "gabinete-gotico" | "tinta-blanca";

export interface Collection {
  slug: CollectionSlug;
  /** Nombre oficial tal como lo escribe la editorial */
  name: string;
  /** Orden oficial de las colecciones */
  order: number;
}

export interface CoverImage {
  /** JPG 500×720 (respaldo) */
  jpg: string;
  /** WebP 500×720 */
  webp: string;
  /** WebP 260×374 para filas y pantallas 1x */
  webpSmall: string;
}

/** Quién participó en el libro además de los autores, con el rol tal como lo publica la editorial. */
export interface Contributor {
  role: string;
  name: string;
}

/**
 * Dónde está el contenido legible de un libro: la obra (carpeta `public/contenido/<obra>/`) y la
 * pieza principal. Las demás piezas (prólogo, nota, epílogo…) salen del manifiesto de la obra.
 */
export interface ReadRef {
  obra: string;
  slug: string;
}

export interface CloudPieceRef {
  slug: string;
  title: string;
  kind: "libro" | "complemento";
  credit: string | null;
}

export interface Book {
  slug: string;
  title: string;
  /** Subtítulo cuando el título oficial lo incluye (p. ej. Terregal) */
  subtitle: string | null;
  authors: string[];
  collection: CollectionSlug;
  /** Número dentro de la colección, si la editorial lo usa */
  collectionNumber: number | null;
  genres: string[];
  hashtag: string | null;
  synopsis: string;
  /** Cita textual oficial del libro (no corregir su puntuación). null si la editorial no la ha dado. */
  quote: string | null;
  prologue: string | null;
  contributors: Contributor[];
  cover: CoverImage;
  /** ISO 8601. null si la editorial aún no confirma la fecha de publicación. */
  publishedAt: string | null;
  /** Edición digital — por confirmar */
  digitalPriceMXN: number | null;
  digitalIsbn: string | null;
  /** Edición impresa (referencia, viene de la landing). null si todavía no está a la venta. */
  print: {
    priceMXN: number;
    format: string;
    weight: string;
    mercadoLibreUrl: string;
  } | null;
  /** Contenido legible en el lector; null si todavía no se ha importado. */
  read: ReadRef | null;
  /** Piezas complementarias publicadas desde la nube cuando no hay manifiesto local. */
  cloudPieces?: CloudPieceRef[];
  /** true si el libro proviene de una obra publicada en línea sin manifiesto local. */
  fromCloud?: boolean;
}

export type UpcomingStatus = "en-produccion" | "en-prensa";

export interface UpcomingBook {
  slug: string;
  title: string;
  /** Autor o crédito de traducción, tal como lo publica la editorial */
  credit: string;
  collection: CollectionSlug;
  genre: string;
  status: UpcomingStatus;
}

export interface CatalogRow {
  id: string;
  title: string;
  meta: string;
  items: Array<{ kind: "book"; book: Book } | { kind: "upcoming"; book: UpcomingBook }>;
}
