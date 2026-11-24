/**
 * Orquesta la exportación de un libro listo para imprimir desde el panel (ADR 0023):
 * lee las piezas (de Supabase o del contenido de demostración), compila el PDF media carta con
 * Typst WASM, opcionalmente lo impone en folleto y guarda una copia en la carpeta privada
 * `impresion` de Supabase.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { slugify } from "~/lib/libro/paquete";
import type { Manifest, Pieza } from "~/lib/libro/types";
import { SUPABASE_KEY, SUPABASE_URL } from "~/lib/supabase";
import { ErrorDeImpresion, compilarLibro } from "./compilar";
import { imponerFolleto } from "./folleto";
import { infoDeImagen } from "./imagenes";
import {
  armarLibro,
  ordenDeImpresion,
  type AvisoImagen,
  type InfoImagen,
  type OpcionesLibro,
} from "./libro";

export type FormatoImpresion = "media-carta" | "folleto";
export type OrigenObra = "nube" | "demo";

export interface PeticionImprimir extends OpcionesLibro {
  obraSlug: string;
  origen: OrigenObra;
  formato: FormatoImpresion;
  desplazamientoMm?: number;
  guardarEnNube?: boolean;
}

export interface ResultadoImpresion {
  nombreArchivo: string;
  pdfBase64: string;
  paginas: number;
  hojas: number | null;
  caras: number | null;
  avisos: AvisoImagen[];
  faltantes: string[];
  advertencias: string[];
  guardadoEnNube: boolean;
}

const SLUG_SEGURO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function rutaSegura(baseDir: string, ...partes: string[]): string {
  const base = resolve(baseDir);
  const destino = resolve(base, ...partes);
  if (destino !== base && !destino.startsWith(`${base}${sep}`))
    throw new ErrorDeImpresion("La dirección del archivo no es válida.");
  return destino;
}

/** Compila e impone (si aplica) un conjunto de piezas ya cargadas en memoria. Lógica pura/testeable. */
export async function generarPdfDePiezas(
  piezas: readonly Pieza[],
  imagenesBytes: ReadonlyMap<string, Uint8Array>,
  opciones: OpcionesLibro & {
    obraSlug: string;
    formato: FormatoImpresion;
    desplazamientoMm?: number;
  },
): Promise<{
  pdf: Uint8Array;
  nombreArchivo: string;
  paginas: number;
  hojas: number | null;
  caras: number | null;
  avisos: AvisoImagen[];
  faltantes: string[];
  advertencias: string[];
}> {
  if (piezas.length === 0) throw new ErrorDeImpresion("La obra no tiene piezas para imprimir.");
  const ordenadas = ordenDeImpresion(piezas);
  const info = new Map<string, InfoImagen>();
  for (const [nombre, bytes] of imagenesBytes) info.set(nombre, infoDeImagen(bytes, nombre));

  const { datos, avisos, faltantes } = armarLibro(ordenadas, opciones, info);
  const compilado = await compilarLibro(datos, imagenesBytes);

  let pdf = compilado.pdf;
  let hojas: number | null = null;
  let caras: number | null = null;

  if (opciones.formato === "folleto") {
    const mm = Math.min(5, Math.max(0, Number(opciones.desplazamientoMm ?? 0) || 0));
    const folleto = await imponerFolleto(compilado.pdf, mm);
    pdf = folleto.pdf;
    hojas = folleto.hojas;
    caras = folleto.caras;
  }

  const base = slugify(opciones.obraSlug) || "libro";
  const sufijo = opciones.formato === "folleto" ? "folleto" : "media-carta";
  return {
    pdf,
    nombreArchivo: `${base}-${sufijo}.pdf`,
    paginas: compilado.paginas,
    hojas,
    caras,
    avisos,
    faltantes,
    advertencias: compilado.advertencias,
  };
}

function cargarObraDemo(obraSlug: string): {
  piezas: Pieza[];
  imagenes: Map<string, Uint8Array>;
} {
  if (!SLUG_SEGURO.test(obraSlug))
    throw new ErrorDeImpresion("La dirección de la obra no es válida.");
  const dir = rutaSegura(join(process.cwd(), "public", "contenido"), obraSlug);
  const manifestPath = rutaSegura(dir, "manifest.json");
  if (!existsSync(manifestPath))
    throw new ErrorDeImpresion("No se encontró esta obra en la demostración.");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  const piezas = manifest.pieces.map(
    (e) => JSON.parse(readFileSync(rutaSegura(dir, e.file), "utf8")) as Pieza,
  );
  const imagenes = new Map<string, Uint8Array>();
  for (const p of piezas) {
    for (const b of p.blocks) {
      if (b.type !== "image" || imagenes.has(b.asset)) continue;
      const rutaImg = rutaSegura(dir, "assets", b.asset);
      if (existsSync(rutaImg)) imagenes.set(b.asset, new Uint8Array(readFileSync(rutaImg)));
    }
  }
  return { piezas, imagenes };
}

interface FilaObraNube {
  id: string;
  slug: string;
  piezas: Array<{
    orden: number;
    vigente: { documento: Pieza } | null;
  }>;
}

async function cargarObraNube(
  obraSlug: string,
  token: string,
): Promise<{ obraId: string; piezas: Pieza[]; imagenes: Map<string, Uint8Array> }> {
  if (!SLUG_SEGURO.test(obraSlug))
    throw new ErrorDeImpresion("La dirección de la obra no es válida.");
  if (!SUPABASE_URL) throw new ErrorDeImpresion("Supabase no está configurado en el servidor.");
  const url =
    `${SUPABASE_URL}/rest/v1/obras?select=id,slug,piezas(orden,vigente:versiones!piezas_version_vigente_fk(documento))` +
    `&slug=eq.${encodeURIComponent(obraSlug)}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ErrorDeImpresion("No se pudieron leer las piezas de la obra.");
  const filas = (await res.json()) as FilaObraNube[];
  const obra = filas[0];
  if (!obra) throw new ErrorDeImpresion("No se encontró la obra en la editorial.");
  const piezas = [...obra.piezas]
    .sort((a, b) => a.orden - b.orden)
    .flatMap((p) => (p.vigente?.documento ? [p.vigente.documento] : []));
  if (piezas.length === 0)
    throw new ErrorDeImpresion("La obra todavía no tiene versiones guardadas para imprimir.");

  const nombres = new Set<string>();
  for (const p of piezas) for (const b of p.blocks) if (b.type === "image") nombres.add(b.asset);

  const imagenes = new Map<string, Uint8Array>();
  await Promise.all(
    [...nombres].map(async (nombre) => {
      const imgRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/authenticated/imagenes/${encodeURIComponent(obraSlug)}/${encodeURIComponent(nombre)}`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } },
      );
      if (imgRes.ok) imagenes.set(nombre, new Uint8Array(await imgRes.arrayBuffer()));
    }),
  );

  return { obraId: obra.id, piezas, imagenes };
}

async function guardarPdfEnSupabase(
  obraId: string,
  obraSlug: string,
  nombreArchivo: string,
  pdf: Uint8Array,
  token: string,
): Promise<boolean> {
  if (!SUPABASE_URL) return false;
  const ruta = `${obraSlug}/${Date.now()}-${nombreArchivo}`;
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/impresion/${ruta}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: Buffer.from(pdf),
  });
  if (!up.ok) {
    console.error("Error subiendo PDF de impresión:", up.status, await up.text().catch(() => ""));
    return false;
  }

  const sha256 = createHash("sha256").update(pdf).digest("hex");
  const reg = await fetch(`${SUPABASE_URL}/rest/v1/archivos?on_conflict=carpeta,ruta`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      obra_id: obraId,
      carpeta: "impresion",
      ruta,
      nombre_original: nombreArchivo,
      tipo_mime: "application/pdf",
      bytes: pdf.byteLength,
      sha256,
    }),
  });
  if (!reg.ok) {
    console.error(
      "Error registrando PDF en archivos:",
      reg.status,
      await reg.text().catch(() => ""),
    );
    return false;
  }
  return true;
}

export async function exportarImpresion(
  peticion: PeticionImprimir,
  token: string,
): Promise<ResultadoImpresion> {
  let obraId: string | null = null;
  let piezas: Pieza[];
  let imagenes: Map<string, Uint8Array>;

  if (peticion.origen === "nube") {
    const nube = await cargarObraNube(peticion.obraSlug, token);
    obraId = nube.obraId;
    piezas = nube.piezas;
    imagenes = nube.imagenes;
  } else {
    const demo = cargarObraDemo(peticion.obraSlug);
    piezas = demo.piezas;
    imagenes = demo.imagenes;
  }

  const generado = await generarPdfDePiezas(piezas, imagenes, peticion);
  const guardadoEnNube =
    peticion.origen === "nube" && obraId !== null && peticion.guardarEnNube !== false
      ? await guardarPdfEnSupabase(
          obraId,
          peticion.obraSlug,
          generado.nombreArchivo,
          generado.pdf,
          token,
        )
      : false;

  return {
    nombreArchivo: generado.nombreArchivo,
    pdfBase64: Buffer.from(generado.pdf).toString("base64"),
    paginas: generado.paginas,
    hojas: generado.hojas,
    caras: generado.caras,
    avisos: generado.avisos,
    faltantes: generado.faltantes,
    advertencias: generado.advertencias,
    guardadoEnNube,
  };
}
