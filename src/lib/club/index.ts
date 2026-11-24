/**
 * Club de lectura: reseñas de quienes compraron y terminaron el libro.
 *
 * HOY SON DATOS DE EJEMPLO para mostrar el diseño (la pantalla lo avisa: "Vista de ejemplo").
 * No hay cuentas ni compras todavía. Las funciones son async a propósito: en el Hito 2 leerán de
 * Supabase (con RLS: solo puede reseñar quien compró y terminó el libro) sin cambiar su firma.
 */

export interface Review {
  id: string;
  /** Nombre de usuario público, tal como se muestra */
  user: string;
  /** Texto relativo ya formateado ("hace 2 días"); en el Hito 2 saldrá de una fecha */
  when: string;
  /** 1 a 5, admite medias estrellas */
  stars: number;
  text: string;
  helpful: number;
  /** Compra verificada */
  verified: boolean;
}

const SAMPLES: Record<string, Review[]> = {
  "el-principe-feliz": [
    {
      id: "pf-1",
      user: "LUIS28DLR",
      when: "hace 2 días",
      stars: 4.5,
      text: "Lo leí en una sola tarde. La golondrina me rompió el corazón, y la traducción suena tan natural que parece escrita en español desde el principio.",
      helpful: 12,
      verified: true,
    },
    {
      id: "pf-2",
      user: "NORESTE.ANA",
      when: "hace 5 días",
      stars: 5,
      text: "Se lo leí a mi hija en voz alta y las dos terminamos en silencio. Las últimas páginas piden una segunda lectura.",
      helpful: 8,
      verified: true,
    },
    {
      id: "pf-3",
      user: "ELLECTORDETURNO",
      when: "hace 1 semana",
      stars: 4,
      text: "Me gustó tener la nota de la traductora aparte. La leí después del cuento y cambió cómo entendí el final.",
      helpful: 5,
      verified: true,
    },
  ],
  nahual: [
    {
      id: "na-1",
      user: "NORTEÑO.REAL",
      when: "hace 3 días",
      stars: 4,
      text: "El monte, el pueblo, las voces… se siente cercano. Cada capítulo con su nombre me hizo detenerme un momento antes de seguir.",
      helpful: 9,
      verified: true,
    },
    {
      id: "na-2",
      user: "LECTORA_DE_TURNO",
      when: "hace 6 días",
      stars: 4.5,
      text: "Lo empecé por curiosidad y no lo solté. El humor negro funciona justo cuando más lo necesitas.",
      helpful: 6,
      verified: true,
    },
    {
      id: "na-3",
      user: "MARCOA.R",
      when: "hace 2 semanas",
      stars: 5,
      text: "El epílogo y los textos del final cambian cómo se lee el cuento completo. Vale la pena leerlos después.",
      helpful: 4,
      verified: true,
    },
  ],
};

export async function getReviews(bookSlug: string): Promise<Review[]> {
  return SAMPLES[bookSlug] ?? [];
}

/** Promedio redondeado a la media estrella más cercana (null si no hay reseñas). */
export function ratingSummary(reviews: readonly Review[]): {
  average: number | null;
  count: number;
} {
  if (reviews.length === 0) return { average: null, count: 0 };
  const mean = reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;
  return { average: Math.round(mean * 2) / 2, count: reviews.length };
}

export type StarKind = "full" | "half" | "empty";

/** Las 5 estrellas de una calificación, con medias estrellas. */
export function starKinds(rating: number): StarKind[] {
  return [1, 2, 3, 4, 5].map((i) => (rating >= i ? "full" : rating >= i - 0.5 ? "half" : "empty"));
}
