/**
 * Utilidades compartidas de autenticación y respuesta para rutas `/api/panel/*` (ADR 0021 y 0023).
 * Verifica la sesión del panel contra Supabase Auth y confirma que exista un perfil del equipo.
 */
import { SUPABASE_KEY, SUPABASE_URL } from "~/lib/supabase";

export const responderJson = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export function tokenDePeticion(request: Request): string | null {
  return /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

/** Devuelve el token validado si la persona pertenece al equipo del panel, o null. */
export async function verificarEquipo(request: Request): Promise<string | null> {
  const token = tokenDePeticion(request);
  if (!token || !SUPABASE_URL) return null;
  const usuario = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!usuario.ok) return null;
  const { id } = (await usuario.json()) as { id?: string };
  if (!id) return null;
  const perfil = await fetch(
    `${SUPABASE_URL}/rest/v1/perfiles?select=id&id=eq.${encodeURIComponent(id)}`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } },
  );
  if (!perfil.ok) return null;
  return ((await perfil.json()) as unknown[]).length === 1 ? token : null;
}
