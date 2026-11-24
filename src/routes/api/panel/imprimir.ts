/**
 * POST /api/panel/imprimir (ADR 0023). Compila el libro completo en PDF media carta o impuesto en
 * folleto (hojas carta) con la plantilla calibrada y opcionalmente guarda una copia en Supabase.
 */
import type { APIEvent } from "@solidjs/start/server";
import { PANEL_ENABLED } from "~/lib/panel";
import { ErrorDeImpresion } from "~/server/imprenta/compilar";
import { exportarImpresion, type PeticionImprimir } from "~/server/imprenta/exportar";
import { responderJson, verificarEquipo } from "~/server/panel-auth";

export async function POST(event: APIEvent) {
  if (!PANEL_ENABLED) return new Response("No encontrado", { status: 404 });
  const token = await verificarEquipo(event.request);
  if (!token)
    return responderJson(401, { error: "Tu sesión terminó. Vuelve a entrar con tu PIN." });

  let cuerpo: Partial<PeticionImprimir>;
  try {
    cuerpo = (await event.request.json()) as Partial<PeticionImprimir>;
  } catch {
    return responderJson(400, { error: "Los datos enviados no son válidos." });
  }

  const obraSlug = typeof cuerpo?.obraSlug === "string" ? cuerpo.obraSlug.trim() : "";
  const titulo = typeof cuerpo?.titulo === "string" ? cuerpo.titulo.trim() : "";
  const autor = typeof cuerpo?.autor === "string" ? cuerpo.autor.trim() : "";
  if (!obraSlug || !titulo)
    return responderJson(400, { error: "Falta indicar la obra y su título." });

  const origen = cuerpo?.origen === "nube" ? "nube" : "demo";
  const formato = cuerpo?.formato === "folleto" ? "folleto" : "media-carta";

  try {
    const resultado = await exportarImpresion(
      {
        obraSlug,
        origen,
        titulo,
        autor,
        legal: typeof cuerpo?.legal === "string" ? cuerpo.legal : "",
        colofon: typeof cuerpo?.colofon === "string" ? cuerpo.colofon : "",
        guiones: Boolean(cuerpo?.guiones),
        multiploDe4: cuerpo?.multiploDe4 !== false,
        margenes: cuerpo?.margenes === "compacto" ? "compacto" : "clasico",
        formato,
        desplazamientoMm:
          typeof cuerpo?.desplazamientoMm === "number" ? cuerpo.desplazamientoMm : 0,
        guardarEnNube: cuerpo?.guardarEnNube !== false,
      },
      token,
    );
    return responderJson(200, resultado);
  } catch (error) {
    if (error instanceof ErrorDeImpresion) return responderJson(422, { error: error.message });
    console.error("imprimir:", error);
    return responderJson(500, {
      error: "No se pudo armar el PDF de imprenta. Inténtalo de nuevo.",
    });
  }
}
