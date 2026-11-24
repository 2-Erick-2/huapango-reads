/**
 * Clientes de Supabase (ADR 0020).
 * - `panel()`: el del panel de la editorial, con sesión (PIN) guardada en este navegador.
 * - `publico()`: el del sitio, sin sesión: solo lee lo publicado (RLS).
 * La llave publicable está hecha para ir en el navegador; la de servicio nunca entra a la app.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

/** false si el build no trae la configuración de Supabase (p. ej. el demo estático). */
export const SUPABASE_LISTO = URL !== "" && KEY !== "";
export const SUPABASE_URL = URL;
export const SUPABASE_KEY = KEY;

let clientePanel: SupabaseClient | null = null;
let clienteLector: SupabaseClient | null = null;
let clientePublico: SupabaseClient | null = null;

export function panel(): SupabaseClient {
  if (!SUPABASE_LISTO) throw new Error("Supabase no está configurado en este build.");
  clientePanel ??= createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "hr-panel-sesion" },
  });
  return clientePanel;
}

/** Cliente para lectores del catálogo público, aislado de la sesión del panel editorial. */
export function lector(): SupabaseClient {
  if (!SUPABASE_LISTO) throw new Error("Supabase no está configurado en este build.");
  clienteLector ??= createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "hr-lector-sesion" },
  });
  return clienteLector;
}

export function publico(): SupabaseClient {
  if (!SUPABASE_LISTO) throw new Error("Supabase no está configurado en este build.");
  clientePublico ??= createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return clientePublico;
}

/** URL pública de una portada (la carpeta "portadas" es pública). */
export function urlPortada(ruta: string): string {
  return `${URL}/storage/v1/object/public/portadas/${ruta.split("/").map(encodeURIComponent).join("/")}`;
}
