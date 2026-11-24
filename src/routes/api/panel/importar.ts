/**
 * POST /api/panel/importar (ADR 0021). Recibe los EPUB de una obra y:
 * - accion=analizar: devuelve las propuestas (papel de estilos e imágenes, dónde empieza cada pieza).
 * - accion=revisar: importa con las decisiones de la persona, verifica y devuelve las piezas listas.
 *
 * Solo para el equipo de la editorial: exige la sesión del panel (token de Supabase) y un perfil.
 * No guarda nada: el panel guarda en Supabase con la sesión de quien importa (RLS aplica).
 */
import type { APIEvent } from "@solidjs/start/server";
import { PANEL_ENABLED } from "~/lib/panel";
import { responderJson, verificarEquipo } from "~/server/panel-auth";
import {
  ErrorDeRevision,
  MAX_EPUB_BYTES,
  analizar,
  revisar,
  type FuenteSubida,
  type PeticionRevisar,
} from "~/server/importar-epub";

const MAX_ARCHIVOS = 8;

export async function POST(event: APIEvent) {
  if (!PANEL_ENABLED) return new Response("No encontrado", { status: 404 });
  if (!(await verificarEquipo(event.request)))
    return responderJson(401, { error: "Tu sesión terminó. Vuelve a entrar con tu PIN." });

  const largo = Number(event.request.headers.get("content-length") ?? "0");
  if (largo > MAX_EPUB_BYTES * 2)
    return responderJson(413, { error: "Los archivos pesan demasiado (máximo 50 MB cada uno)." });

  let form: FormData;
  try {
    form = await event.request.formData();
  } catch {
    return responderJson(400, { error: "No se pudieron leer los archivos enviados." });
  }

  const archivos = form.getAll("archivos").filter((a): a is File => a instanceof File);
  if (archivos.length === 0) return responderJson(400, { error: "Sube al menos un archivo EPUB." });
  if (archivos.length > MAX_ARCHIVOS)
    return responderJson(400, { error: `Sube como máximo ${MAX_ARCHIVOS} archivos a la vez.` });
  const fuentes: FuenteSubida[] = [];
  for (const a of archivos) {
    if (!/\.epub$/i.test(a.name))
      return responderJson(400, {
        error: `«${a.name}» no es un EPUB. Expórtalo desde InDesign como EPUB.`,
      });
    if (a.size > MAX_EPUB_BYTES)
      return responderJson(413, { error: `«${a.name}» pesa más de 50 MB.` });
    fuentes.push({ nombre: a.name, datos: Buffer.from(await a.arrayBuffer()) });
  }

  try {
    if (form.get("accion") === "revisar") {
      const decisiones = JSON.parse(
        String(form.get("decisiones") ?? "null"),
      ) as PeticionRevisar | null;
      if (!decisiones || !Array.isArray(decisiones.fuentes))
        return responderJson(400, { error: "Faltan las decisiones de la revisión." });
      return responderJson(200, revisar(fuentes, decisiones));
    }
    return responderJson(200, { fuentes: analizar(fuentes) });
  } catch (error) {
    if (error instanceof ErrorDeRevision) return responderJson(422, { error: error.message });
    console.error("importar:", error);
    const detalle = error instanceof Error ? error.message : "";
    return responderJson(422, {
      error: `No se pudo leer el archivo. ¿Es un EPUB exportado desde InDesign? ${detalle}`.trim(),
    });
  }
}
