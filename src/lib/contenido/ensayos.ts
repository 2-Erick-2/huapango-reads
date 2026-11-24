/**
 * Ensayos publicados desde el panel (ADR 0019 y 0021). Son gratuitos: el sitio los lee de Supabase
 * sin sesión; las reglas de la base (RLS) solo dejan ver los ensayos ya publicados.
 */
import type { Pieza, PiezaStats } from "~/lib/libro/types";
import { SUPABASE_LISTO, publico } from "~/lib/supabase";

export interface EnsayoPublicado {
  obra: string;
  slug: string;
  title: string;
  credit: string | null;
  summary: string | null;
  minutes: number;
}

interface FilaEnsayo {
  slug: string;
  titulo: string;
  autores: string[];
  sinopsis: string;
  piezas: Array<{
    slug: string;
    titulo: string;
    firma: string | null;
    publicada: { stats: PiezaStats | null } | null;
  }>;
}

export async function ensayosPublicados(): Promise<EnsayoPublicado[]> {
  if (!SUPABASE_LISTO) return [];
  try {
    const { data, error } = await publico()
      .from("obras")
      .select(
        "slug, titulo, autores, sinopsis, publicada_en, " +
          "piezas(slug, titulo, firma, publicada:versiones!piezas_version_publicada_fk(stats:documento->stats))",
      )
      .eq("tipo", "ensayo")
      .eq("estado", "publicada")
      .order("publicada_en", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as FilaEnsayo[]).flatMap((o) => {
      const p = o.piezas[0];
      if (!p?.publicada) return [];
      return [
        {
          obra: o.slug,
          slug: p.slug,
          title: o.titulo,
          credit: o.autores.join(" y ") || p.firma,
          summary: o.sinopsis || null,
          minutes: p.publicada.stats?.minutes ?? 1,
        },
      ];
    });
  } catch (error) {
    // El sitio no debe caerse si la base no responde: la fila muestra lo que haya.
    console.error("ensayos:", error);
    return [];
  }
}

export interface EnsayoParaLeer {
  pieza: Pieza;
  /** URLs temporales de sus imágenes, por nombre de archivo */
  imagenes: Record<string, string>;
}

export interface MuestraLibroParaLeer {
  titulo: string;
  autores: string[];
  pieza: Pieza;
  imagenes: Record<string, string>;
}

async function firmarImagenesPieza(obra: string, pieza: Pieza): Promise<Record<string, string>> {
  const nombres = pieza.blocks.flatMap((b) => (b.type === "image" ? [b.asset] : []));
  const imagenes: Record<string, string> = {};
  if (nombres.length === 0) return imagenes;
  const { data: urls } = await publico()
    .storage.from("imagenes")
    .createSignedUrls(
      nombres.map((n) => `${obra}/${n}`),
      3600,
    );
  for (const u of urls ?? []) {
    const nombre = u.path?.split("/").pop();
    if (nombre && u.signedUrl) imagenes[nombre] = u.signedUrl;
  }
  return imagenes;
}

/** Texto publicado de un ensayo, o null si no existe o no está publicado. */
export async function ensayoPublicado(obra: string): Promise<EnsayoParaLeer | null> {
  if (!SUPABASE_LISTO) return null;
  const { data, error } = await publico()
    .from("obras")
    .select("slug, piezas(publicada:versiones!piezas_version_publicada_fk(documento))")
    .eq("slug", obra)
    .eq("tipo", "ensayo")
    .eq("estado", "publicada")
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el ensayo.");
  const fila = data as { piezas: Array<{ publicada: { documento: Pieza } | null }> } | null;
  const pieza = fila?.piezas[0]?.publicada?.documento;
  if (!pieza) return null;
  const imagenes = await firmarImagenesPieza(obra, pieza);
  return { pieza, imagenes };
}

/** Muestra gratuita (primeros 4 bloques) de un libro publicado desde el panel. */
export async function muestraLibroPublicado(obra: string): Promise<MuestraLibroParaLeer | null> {
  if (!SUPABASE_LISTO) return null;
  try {
    const { data, error } = await publico().rpc("muestra_libro", { p_slug: obra });
    if (error || !data) return null;
    const fila = data as { titulo?: string; autores?: string[]; pieza?: Pieza };
    if (!fila.pieza || !Array.isArray(fila.pieza.blocks)) return null;
    const imagenes = await firmarImagenesPieza(obra, fila.pieza);
    return {
      titulo: fila.titulo ?? fila.pieza.title,
      autores: Array.isArray(fila.autores) ? fila.autores : [],
      pieza: fila.pieza,
      imagenes,
    };
  } catch {
    return null;
  }
}
