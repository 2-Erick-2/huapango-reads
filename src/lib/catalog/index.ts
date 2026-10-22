/**
 * Acceso al catálogo. Las funciones son async a propósito: hoy leen datos locales,
 * en el Hito 2 consultarán Supabase sin cambiar su firma ni la UI.
 */
import { BOOKS, COLLECTIONS, FEATURED_SLUG, UPCOMING } from "./data";
import type { Book, CatalogRow, CollectionSlug, UpcomingBook } from "./types";

export type { Book, CatalogRow, Collection, CollectionSlug, UpcomingBook } from "./types";

export function collectionName(slug: CollectionSlug): string {
  return COLLECTIONS.find((c) => c.slug === slug)?.name ?? slug;
}

/** "Luis Armando Rosado" o "Eduardo Serrato & Luis Armando Rosado" */
export function formatAuthors(authors: string[]): string {
  return authors.join(" & ");
}

/** Precio digital o "Precio por confirmar" (nunca se reutiliza el impreso) */
export function formatDigitalPrice(book: Pick<Book, "digitalPriceMXN">): string {
  if (book.digitalPriceMXN === null) return "Precio por confirmar";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    book.digitalPriceMXN,
  );
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

export function upcomingStatusLabel(status: UpcomingBook["status"]): string {
  return status === "en-prensa" ? "En prensa" : "En producción";
}

export async function getBooks(): Promise<Book[]> {
  return BOOKS;
}

export async function getBook(slug: string): Promise<Book | undefined> {
  return BOOKS.find((b) => b.slug === slug);
}

export async function getFeaturedBook(): Promise<Book> {
  const book = BOOKS.find((b) => b.slug === FEATURED_SLUG) ?? BOOKS[0];
  if (!book) throw new Error("El catálogo está vacío");
  return book;
}

export async function getRelatedBooks(book: Book): Promise<Book[]> {
  return BOOKS.filter((b) => b.collection === book.collection && b.slug !== book.slug);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Filas del inicio, en el orden oficial de las colecciones */
export async function getHomeRows(): Promise<CatalogRow[]> {
  const rows: CatalogRow[] = [
    {
      id: "novedades",
      title: "Novedades",
      meta: plural(BOOKS.length, "título", "títulos"),
      items: BOOKS.map((book) => ({ kind: "book", book })),
    },
  ];

  for (const collection of [...COLLECTIONS].sort((a, b) => a.order - b.order)) {
    const published = BOOKS.filter((b) => b.collection === collection.slug);
    const upcoming = UPCOMING.filter((b) => b.collection === collection.slug);
    if (published.length === 0) continue; // las colecciones sin publicados van en "Próximamente"
    rows.push({
      id: collection.slug,
      title:
        collection.slug === "cuentos-a-todas-partes"
          ? collection.name
          : `Colección ${collection.name}`,
      meta: plural(published.length + upcoming.length, "título", "títulos"),
      items: [
        ...published.map((book) => ({ kind: "book" as const, book })),
        ...upcoming.map((book) => ({ kind: "upcoming" as const, book })),
      ],
    });
  }

  rows.push({
    id: "proximamente",
    title: "Próximamente",
    meta: "En producción y en prensa",
    items: UPCOMING.map((book) => ({ kind: "upcoming", book })),
  });

  return rows;
}
