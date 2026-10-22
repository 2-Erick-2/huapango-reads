/**
 * Catálogo real de Editorial Huapango (fuente: landing editorialhuapango.com.mx y
 * .claude/skills/huapango-reads/references/catalogo.md).
 * Fuente LOCAL temporal — en el Hito 2 se reemplaza por Supabase (ver docs/ROADMAP.md).
 * Regla: no inventar datos. Lo desconocido va en `null` ("Por confirmar").
 */
import { asset } from "../site";
import type { Book, Collection, UpcomingBook } from "./types";

const cover = (file: string) => ({
  jpg: asset(`/books/${file}.jpg`),
  webp: asset(`/books/${file}.webp`),
  webpSmall: asset(`/books/${file}-260.webp`),
});

const PRINT_FORMAT = "Bolsillo 18 × 12.5 cm · Bond crema 70 g · Cubierta flexible";
const ML = "https://www.mercadolibre.com.mx";
const SELLER = "?pdp_filters=seller_id%3A2478697092";

export const COLLECTIONS: Collection[] = [
  { slug: "raices", name: "Raíces", order: 1 },
  { slug: "cuentos-a-todas-partes", name: "Cuentos a todas partes", order: 2 },
  { slug: "ecos", name: "ECOS", order: 3 },
  { slug: "gabinete-gotico", name: "Gabinete Gótico", order: 4 },
  { slug: "tinta-blanca", name: "Tinta blanca", order: 5 },
];

export const BOOKS: Book[] = [
  {
    slug: "nahual",
    title: "Nahual",
    subtitle: null,
    authors: ["Luis Armando Rosado"],
    collection: "raices",
    collectionNumber: 1,
    genres: ["Realismo mágico", "Comedy horror"],
    hashtag: null,
    synopsis:
      "Un cuento largo de comedy horror donde un nahual pone de cabeza al pueblo al darle caza. Una inmersión en el misticismo del monte fronterizo y la transmutación humana donde las criaturas míticas desafían el orden cotidiano del noreste.",
    quote:
      "«Fue Miguel, el hijo de Atilano el que lo vio primero. Algo parecido a un perro, bebía embelesado la tibia sangre encharcada dentro de la panza de un becerro.»",
    prologue: null,
    cover: cover("portada-nahual"),
    publishedAt: "2026-04-23",
    digitalPriceMXN: null,
    digitalIsbn: null,
    print: {
      priceMXN: 250,
      format: PRINT_FORMAT,
      weight: "153 g",
      mercadoLibreUrl: `${ML}/nahual--luis-armando-rosado--editorial-huapango/up/MLMU4103853249${SELLER}`,
    },
    hasSample: false,
  },
  {
    slug: "terregal",
    title: "Terregal",
    subtitle: "Entre este & los próximos mil años",
    authors: ["Eduardo Serrato", "Luis Armando Rosado"],
    collection: "raices",
    collectionNumber: 2,
    genres: ["Mexa-ficción norestense"],
    hashtag: null,
    synopsis:
      "El uróboros contemporáneo: una coautoría de 100 cuentos cortos de mexa-ficción donde el sarcasmo protagoniza en todo momento este imaginario retrofuturista del desierto norestense.",
    quote: "«¿Qué polvo se levanta si agitamos las páginas del sinsentido entre pasado y futuro?»",
    prologue: "Prólogo de Renato Tinajero",
    cover: cover("portada-terregal"),
    publishedAt: "2026-04-23",
    digitalPriceMXN: null,
    digitalIsbn: null,
    print: {
      priceMXN: 250,
      format: PRINT_FORMAT,
      weight: "176 g",
      mercadoLibreUrl: `${ML}/terregal-entre-este-y-los-proximos-mil-anos/up/MLMU4172477919${SELLER}`,
    },
    hasSample: false,
  },
  {
    slug: "todo-lo-que-puedas-imaginar",
    title: "Todo lo que puedas imaginar",
    subtitle: null,
    authors: ["Vanessa Aranda"],
    collection: "cuentos-a-todas-partes",
    collectionNumber: null,
    genres: ["Infantil"],
    hashtag: "#TPi",
    synopsis:
      "Una guía escondida entre las páginas donde niños y grandes se sientan a leer y encuentran en sus líneas un recordatorio lúdico del poder inagotable de soñar desde cualquier rincón.",
    quote: "«Una invitación a quedarnos con la mejor versión de nuestra imaginación.»",
    prologue: null,
    cover: cover("portada-todo-lo-que-puedas-imaginar"),
    publishedAt: "2026-04-23",
    digitalPriceMXN: null,
    digitalIsbn: null,
    print: {
      priceMXN: 150,
      format: PRINT_FORMAT,
      weight: "110 g",
      mercadoLibreUrl: `${ML}/todo-lo-que-puedas-imaginar-cuentos-a-todas-partes/up/MLMU4190757094${SELLER}`,
    },
    hasSample: false,
  },
  {
    slug: "renacer-en-piel-del-tiempo",
    title: "Renacer en piel del tiempo",
    subtitle: null,
    authors: ["Ángelus"],
    collection: "raices",
    collectionNumber: null,
    genres: ["Poesía contemporánea"],
    hashtag: null,
    synopsis:
      "Poemario íntimo que reencuentra al lector con su propia vida. Versos que caminan sobre la piel de la memoria cotidiana, capturando la belleza y la fragilidad del tiempo.",
    quote:
      "«No es necesario que arda toda la noche, basta con que encienda lo suficiente para recordarnos que la vida pese a sus sombras sigue siendo habitable.»",
    prologue: null,
    cover: cover("portada-renacer-en-piel-del-tiempo"),
    publishedAt: "2026-04-23",
    digitalPriceMXN: null,
    digitalIsbn: null,
    print: {
      priceMXN: 250,
      format: PRINT_FORMAT,
      weight: "Formato ligero",
      mercadoLibreUrl: `${ML}/renacer-en-piel-del-tiempo-poesia-de-lo-cotidiano/up/MLMU4190729604${SELLER}`,
    },
    hasSample: false,
  },
];

export const UPCOMING: UpcomingBook[] = [
  {
    slug: "observaciones-de-la-estetica-de-la-poesia",
    title: "Observaciones de la estética de la poesía",
    credit: "Renato Tinajero",
    collection: "ecos",
    genre: "Ensayo",
    status: "en-produccion",
  },
  {
    slug: "el-bufalo-entre-la-nieve",
    title: "El búfalo entre la nieve",
    credit: "Luis Armando Rosado",
    collection: "tinta-blanca",
    genre: "Novela filosófica",
    status: "en-produccion",
  },
  {
    slug: "nohemi",
    title: "Nohemí",
    credit: "Pedro Luis Aguilar",
    collection: "cuentos-a-todas-partes",
    genre: "Cuento adolescente",
    status: "en-produccion",
  },
  {
    slug: "el-principe-feliz",
    title: "El príncipe feliz",
    credit: "Oscar Wilde · traducción actualizada y comentada por Isabel Campos",
    collection: "cuentos-a-todas-partes",
    genre: "Cuento infantil",
    status: "en-prensa",
  },
  {
    slug: "carmilla",
    title: "Carmilla",
    credit: "Sheridan Le Fanu · traducción actualizada por Valery Silva",
    collection: "gabinete-gotico",
    genre: "Gótico",
    status: "en-prensa",
  },
];

/** Libro destacado en el hero del inicio */
export const FEATURED_SLUG = "nahual";
