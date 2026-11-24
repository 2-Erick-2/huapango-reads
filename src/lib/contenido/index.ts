/**
 * Acceso al contenido legible (formato canónico). El manifiesto de cada obra está compilado en la
 * app (`manifests.generated.ts`) y el texto de cada pieza se pide bajo demanda a
 * `public/contenido/<obra>/<pieza>.json`.
 *
 * En el Hito 2 las piezas dejan de ser archivos estáticos y salen de la Edge Function `get-chapter`
 * (compra verificada + URL firmada). Esta interfaz no cambia: solo cambia de dónde se lee.
 */
import type { Book } from "~/lib/catalog/types";
import type { Manifest, ManifestEntry, Pieza } from "~/lib/libro/types";
import { asset } from "~/lib/site";
import { MANIFESTS } from "./manifests.generated";

export function getManifest(obra: string): Manifest | undefined {
  return MANIFESTS[obra];
}

export function findEntry(manifest: Manifest, slug: string): ManifestEntry | undefined {
  return manifest.pieces.find((p) => p.slug === slug);
}

/** La pieza principal de la obra: el libro o, en un ensayo, el ensayo. */
export function mainEntry(manifest: Manifest): ManifestEntry | undefined {
  return manifest.pieces.find((p) => p.kind === "libro" || p.kind === "ensayo");
}

/** Piezas ligadas al libro (prólogo, nota, epílogo…), en orden de lectura. */
export function complementos(manifest: Manifest): ManifestEntry[] {
  return manifest.pieces.filter((p) => p.kind === "complemento");
}

/** Ruta del lector para una pieza. Sin `slug`, abre la principal. */
export function readHref(obra: string, slug?: string): string {
  return slug === undefined ? `/leer/${obra}` : `/leer/${obra}/${slug}`;
}

/** Etiqueta corta de una pieza para su listón: "Prólogo" → "prólogo", "Nota del autor" → "nota". */
export function piezaTag(title: string): string {
  return title.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

/** A dónde lleva "Leer muestra" de un libro: su lectura real o, si aún no tiene, el lector de demostración. */
export function bookReadHref(book: Pick<Book, "read">): string {
  return book.read ? readHref(book.read.obra) : "/leer/demo";
}

export const contenidoUrl = (obra: string, file: string) => asset(`/contenido/${obra}/${file}`);
export const assetUrl = (obra: string, name: string) => contenidoUrl(obra, `assets/${name}`);

/** Carga una pieza. Valida lo mínimo para fallar con un mensaje claro si el archivo no es el esperado. */
export async function loadPieza(
  obra: string,
  slug: string,
  fetcher: typeof fetch = fetch,
): Promise<Pieza> {
  const manifest = getManifest(obra);
  const entry = manifest ? findEntry(manifest, slug) : undefined;
  if (!entry) throw new Error(`No existe la pieza "${slug}" en la obra "${obra}"`);

  const response = await fetcher(contenidoUrl(obra, entry.file));
  if (!response.ok) throw new Error(`No se pudo cargar "${entry.title}" (HTTP ${response.status})`);
  const data = (await response.json()) as Pieza;
  if (data.version !== 1 || data.slug !== slug || !Array.isArray(data.blocks))
    throw new Error(`El contenido de "${entry.title}" no tiene el formato esperado`);
  return data;
}
