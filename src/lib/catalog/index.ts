/**
 * Acceso al catálogo. Combina el catálogo curado de la editorial con las obras de tipo libro
 * publicadas desde el panel en Supabase, con respaldo automático a datos locales.
 */
import { publico, SUPABASE_LISTO, urlPortada } from "~/lib/supabase";
import { BOOKS, COLLECTIONS, FEATURED_SLUG, UPCOMING } from "./data";
import type { Book, CatalogRow, CloudPieceRef, CollectionSlug, UpcomingBook } from "./types";

export type { Book, CatalogRow, Collection, CollectionSlug, UpcomingBook } from "./types";

export interface FilaObraCatalogo {
  slug: string;
  titulo: string;
  subtitulo: string | null;
  autores: string[] | null;
  coleccion: string;
  sinopsis: string | null;
  cita: string | null;
  generos: string[] | null;
  precio_digital_mxn: number | null;
  isbn_digital: string | null;
  fecha_publicacion: string | null;
  portada_ruta: string | null;
  piezas?: Array<{
    slug: string;
    titulo: string;
    tipo: "libro" | "complemento" | "ensayo";
    firma: string | null;
    orden: number;
    version_publicada: string | null;
  }>;
}

function esColeccionValida(slug: string): slug is CollectionSlug {
  return COLLECTIONS.some((c) => c.slug === slug);
}

/**
 * Une los libros locales con las filas publicadas en Supabase.
 * Si un libro local también existe publicado en Supabase, actualiza sus datos editoriales y
 * conserva sus recursos estáticos (portada WebP, edición impresa, manifiesto).
 */
export function combinarCatalogo(locales: Book[], nubes: FilaObraCatalogo[]): Book[] {
  const porSlug = new Map<string, Book>();
  const ordenLocal = locales.map((b) => {
    porSlug.set(b.slug, b);
    return b.slug;
  });

  const extras: Book[] = [];

  for (const fila of nubes) {
    const coleccion: CollectionSlug = esColeccionValida(fila.coleccion) ? fila.coleccion : "ecos";
    const piezasPublicadas = [...(fila.piezas ?? [])]
      .filter((p) => Boolean(p.version_publicada))
      .sort((a, b) => a.orden - b.orden);
    const principal = piezasPublicadas.find((p) => p.tipo === "libro") ?? piezasPublicadas[0];
    const complementarias: CloudPieceRef[] = piezasPublicadas
      .filter((p) => p.tipo === "complemento")
      .map((p) => ({
        slug: p.slug,
        title: p.titulo,
        kind: "complemento",
        credit: p.firma,
      }));

    const portadaUrl = fila.portada_ruta ? urlPortada(fila.portada_ruta) : null;
    const existente = porSlug.get(fila.slug);

    if (existente) {
      porSlug.set(fila.slug, {
        ...existente,
        title: fila.titulo || existente.title,
        subtitle: fila.subtitulo ?? existente.subtitle,
        authors: fila.autores && fila.autores.length > 0 ? fila.autores : existente.authors,
        collection: esColeccionValida(fila.coleccion) ? fila.coleccion : existente.collection,
        genres: fila.generos && fila.generos.length > 0 ? fila.generos : existente.genres,
        synopsis: fila.sinopsis?.trim() ? fila.sinopsis : existente.synopsis,
        quote: fila.cita ?? existente.quote,
        digitalPriceMXN: fila.precio_digital_mxn ?? existente.digitalPriceMXN,
        digitalIsbn: fila.isbn_digital ?? existente.digitalIsbn,
        publishedAt: fila.fecha_publicacion ?? existente.publishedAt,
        cover: portadaUrl
          ? { jpg: portadaUrl, webp: portadaUrl, webpSmall: portadaUrl }
          : existente.cover,
        read: existente.read ?? (principal ? { obra: fila.slug, slug: principal.slug } : null),
        cloudPieces:
          existente.cloudPieces ?? (complementarias.length > 0 ? complementarias : undefined),
      });
      continue;
    }

    extras.push({
      slug: fila.slug,
      title: fila.titulo,
      subtitle: fila.subtitulo,
      authors: fila.autores && fila.autores.length > 0 ? fila.autores : ["Editorial Huapango"],
      collection: coleccion,
      collectionNumber: null,
      genres: fila.generos && fila.generos.length > 0 ? fila.generos : ["Catálogo digital"],
      hashtag: null,
      synopsis:
        fila.sinopsis?.trim() || "Obra publicada en el catálogo digital de Editorial Huapango.",
      quote: fila.cita,
      prologue: null,
      contributors: [],
      cover: portadaUrl
        ? { jpg: portadaUrl, webp: portadaUrl, webpSmall: portadaUrl }
        : { jpg: "", webp: "", webpSmall: "" },
      publishedAt: fila.fecha_publicacion,
      digitalPriceMXN: fila.precio_digital_mxn,
      digitalIsbn: fila.isbn_digital,
      print: null,
      read: principal ? { obra: fila.slug, slug: principal.slug } : null,
      cloudPieces: complementarias.length > 0 ? complementarias : undefined,
      fromCloud: true,
    });
  }

  return [
    ...ordenLocal.flatMap((slug) => {
      const book = porSlug.get(slug);
      return book ? [book] : [];
    }),
    ...extras,
  ];
}

async function librosDesdeNube(): Promise<FilaObraCatalogo[]> {
  if (!SUPABASE_LISTO) return [];
  try {
    const { data, error } = await publico()
      .from("obras")
      .select(
        "slug, titulo, subtitulo, autores, coleccion, sinopsis, cita, generos, precio_digital_mxn, isbn_digital, fecha_publicacion, portada_ruta, piezas(slug, titulo, tipo, firma, orden, version_publicada)",
      )
      .eq("tipo", "libro")
      .eq("estado", "publicada")
      .order("creado_en", { ascending: false });
    if (error || !data) return [];
    return data as FilaObraCatalogo[];
  } catch {
    return [];
  }
}

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
  const nubes = await librosDesdeNube();
  return combinarCatalogo(BOOKS, nubes);
}

export async function getBook(slug: string): Promise<Book | undefined> {
  const todos = await getBooks();
  return todos.find((b) => b.slug === slug);
}

/** Versión síncrona para quien ya está en el servidor o el navegador con los datos locales. */
export function getBookSync(slug: string): Book | undefined {
  return BOOKS.find((b) => b.slug === slug);
}

export async function getFeaturedBook(): Promise<Book> {
  const todos = await getBooks();
  const book = todos.find((b) => b.slug === FEATURED_SLUG) ?? todos[0];
  if (!book) throw new Error("El catálogo está vacío");
  return book;
}

export async function getRelatedBooks(book: Book): Promise<Book[]> {
  const todos = await getBooks();
  return todos.filter((b) => b.collection === book.collection && b.slug !== book.slug);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Filas del inicio, en el orden oficial de las colecciones */
export async function getHomeRows(): Promise<CatalogRow[]> {
  const libros = await getBooks();
  const rows: CatalogRow[] = [
    {
      id: "novedades",
      title: "Novedades",
      meta: plural(libros.length, "título", "títulos"),
      items: libros.map((book) => ({ kind: "book", book })),
    },
  ];

  for (const collection of [...COLLECTIONS].sort((a, b) => a.order - b.order)) {
    const published = libros.filter((b) => b.collection === collection.slug);
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
