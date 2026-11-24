import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function responder(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return responder(405, { error: "Método no permitido." });
  }

  let payload: { nombre?: unknown; correo?: unknown; clave?: unknown };
  try {
    payload = await req.json();
  } catch {
    return responder(400, { error: "Solicitud inválida." });
  }

  const nombre = typeof payload.nombre === "string" ? payload.nombre.trim() : "";
  const correo = typeof payload.correo === "string" ? payload.correo.trim().toLowerCase() : "";
  const clave = typeof payload.clave === "string" ? payload.clave : "";

  if (nombre.length < 2 || nombre.length > 100) {
    return responder(400, { error: "Escribe tu nombre completo (entre 2 y 100 caracteres)." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 254) {
    return responder(400, { error: "Escribe una dirección de correo válida." });
  }
  if (correo.endsWith("@panel.huapango.invalid")) {
    return responder(403, { error: "Usa un correo personal para crear tu cuenta de lector." });
  }
  if (clave.length < 8 || clave.length > 128) {
    return responder(400, { error: "La contraseña debe tener entre 8 y 128 caracteres." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return responder(500, { error: "Configuración del servidor incompleta." });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Los correos del equipo editorial nunca se registran desde aquí (ver migración 000008).
  const { data: equipo } = await admin
    .from("equipo_permitido")
    .select("email")
    .eq("email", correo)
    .maybeSingle();
  if (equipo) {
    return responder(403, { error: "Usa un correo personal para crear tu cuenta de lector." });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true,
    user_metadata: { nombre },
    // Solo el servidor puede escribir app_metadata: marca la cuenta como de lector, así la base nunca
    // le da acceso al panel aunque su correo llegara a estar autorizado para el equipo.
    app_metadata: { origen: "registro-lector" },
  });

  if (error || !data.user) {
    const msg = (error?.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
      return responder(409, {
        error: "Ya existe una cuenta registrada con ese correo. Inicia sesión arriba.",
      });
    }
    return responder(400, {
      error: "No pudimos crear la cuenta en este momento. Verifica tus datos e intenta de nuevo.",
    });
  }

  return responder(201, { ok: true, id: data.user.id });
});
