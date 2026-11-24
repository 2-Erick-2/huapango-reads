/**
 * Estado y acciones de cuenta para lectores de Huapango +reads.
 * Usa un cliente de autenticación aislado del panel editorial (`hr-lector-sesion`)
 * y permite navegar en modo invitado (`hr:invitado`) sin crear cuenta.
 */
import { createSignal } from "solid-js";
import { lector, SUPABASE_LISTO } from "~/lib/supabase";

export interface PerfilLector {
  id: string;
  nombre: string;
  correo: string;
}

export type ModoCuenta = "cargando" | "sesion" | "invitado" | "anonimo";

export interface EstadoCuenta {
  modo: ModoCuenta;
  lector: PerfilLector | null;
}

export interface ProgresoNube {
  obra_slug: string;
  pieza_slug: string;
  ratio: number;
  actualizado_en: string;
}

const INVITADO_KEY = "hr:invitado";
type MiniStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const [cuenta, setCuenta] = createSignal<EstadoCuenta>({
  modo: "anonimo",
  lector: null,
});

let escuchaIniciada = false;
let promesaInicial: Promise<ModoCuenta> | null = null;

function almacenPorDefecto(): MiniStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function esInvitadoLocal(store: MiniStore | null = almacenPorDefecto()): boolean {
  try {
    return store?.getItem(INVITADO_KEY) === "1";
  } catch {
    return false;
  }
}

function guardarInvitadoLocal(activo: boolean, store: MiniStore | null = almacenPorDefecto()) {
  try {
    if (activo) store?.setItem(INVITADO_KEY, "1");
    else store?.removeItem(INVITADO_KEY);
  } catch {
    // almacenamiento bloqueado: la sesión en memoria sigue funcionando
  }
}

export function nombreVisibleDeCorreo(correo: string): string {
  const local = correo.split("@")[0]?.trim() ?? "";
  if (!local) return "Lector";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** Traduce errores técnicos de acceso a mensajes claros y humanos en español. */
export function traducirErrorLector(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.";
  }
  if (m.includes("email not confirmed")) {
    return "Aún falta confirmar tu correo. Revisa tu bandeja de entrada o solicita otro enlace.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Ya existe una cuenta registrada con ese correo. Inicia sesión arriba.";
  }
  if (m.includes("password should be at least") || m.includes("weak password")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Demasiados intentos seguidos. Espera un momento antes de volver a intentar.";
  }
  if (m.includes("invalid email") || m.includes("unable to validate email")) {
    return "Escribe una dirección de correo válida.";
  }
  return "No pudimos completar tu solicitud en este momento. Intenta de nuevo en unos segundos.";
}

async function resolverPerfil(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<PerfilLector> {
  const correo = user.email ?? "";
  const metaNombre =
    typeof user.user_metadata?.nombre === "string" ? user.user_metadata.nombre.trim() : "";
  const respaldo = metaNombre || nombreVisibleDeCorreo(correo);

  try {
    const sb = lector();
    const { data } = await sb.from("lectores").select("nombre").eq("id", user.id).maybeSingle();
    if (data?.nombre) {
      return { id: user.id, nombre: data.nombre, correo };
    }
    // Si la cuenta se creó antes o faltó el perfil, lo aseguramos bajo su propia sesión.
    await sb.from("lectores").upsert({ id: user.id, nombre: respaldo }, { onConflict: "id" });
  } catch {
    // Mantiene el nombre de respaldo si la consulta falla temporalmente.
  }

  return { id: user.id, nombre: respaldo, correo };
}

/** Inicializa una sola vez la lectura y escucha de sesión en el navegador. */
export function iniciarCuentaLector() {
  if (typeof window === "undefined") return;
  if (escuchaIniciada) return;
  escuchaIniciada = true;

  if (!SUPABASE_LISTO) {
    const modo: ModoCuenta = esInvitadoLocal() ? "invitado" : "anonimo";
    setCuenta({ modo, lector: null });
    promesaInicial = Promise.resolve(modo);
    return;
  }

  setCuenta({ modo: "cargando", lector: null });
  const sb = lector();

  promesaInicial = sb.auth
    .getSession()
    .then(async ({ data }): Promise<ModoCuenta> => {
      const user = data.session?.user;
      if (user && !user.email?.endsWith("@panel.huapango.invalid")) {
        const perfil = await resolverPerfil(user);
        guardarInvitadoLocal(false);
        setCuenta({ modo: "sesion", lector: perfil });
        return "sesion";
      }
      const modo: ModoCuenta = esInvitadoLocal() ? "invitado" : "anonimo";
      setCuenta({ modo, lector: null });
      return modo;
    })
    .catch((): ModoCuenta => {
      const modo: ModoCuenta = esInvitadoLocal() ? "invitado" : "anonimo";
      setCuenta({ modo, lector: null });
      return modo;
    });

  sb.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    if (user && !user.email?.endsWith("@panel.huapango.invalid")) {
      void resolverPerfil(user).then((perfil) => {
        guardarInvitadoLocal(false);
        setCuenta({ modo: "sesion", lector: perfil });
      });
    } else {
      setCuenta(
        esInvitadoLocal() ? { modo: "invitado", lector: null } : { modo: "anonimo", lector: null },
      );
    }
  });
}

/** Espera a que la sesión o modo invitado queden resueltos en el navegador. */
export async function verificarAccesoInicial(): Promise<ModoCuenta> {
  if (typeof window === "undefined") return "anonimo";
  iniciarCuentaLector();
  if (promesaInicial) await promesaInicial;
  return cuenta().modo;
}

/** Estado reactivo actual de la cuenta del lector. */
export function estadoCuenta(): EstadoCuenta {
  return cuenta();
}

/** Activa el modo invitado para leer muestras y guardar progreso solo en este dispositivo. */
export function activarInvitado(store: MiniStore | null = almacenPorDefecto()) {
  guardarInvitadoLocal(true, store);
  setCuenta({ modo: "invitado", lector: null });
}

export async function entrarConClave(
  correo: string,
  clave: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!SUPABASE_LISTO) {
    return { ok: false, error: "Las cuentas en línea no están activas en esta vista previa." };
  }
  const email = correo.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Escribe una dirección de correo válida." };
  if (!clave) return { ok: false, error: "Escribe tu contraseña." };
  if (email.endsWith("@panel.huapango.invalid")) {
    return {
      ok: false,
      error: "Ese acceso pertenece al equipo editorial, no al catálogo público.",
    };
  }

  const { data, error } = await lector().auth.signInWithPassword({ email, password: clave });
  if (error || !data.user) {
    return { ok: false, error: traducirErrorLector(error?.message ?? "") };
  }
  const perfil = await resolverPerfil(data.user);
  guardarInvitadoLocal(false);
  setCuenta({ modo: "sesion", lector: perfil });
  return { ok: true };
}

export async function registrarLector(
  nombre: string,
  correo: string,
  clave: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!SUPABASE_LISTO) {
    return { ok: false, error: "Las cuentas en línea no están activas en esta vista previa." };
  }
  const nombreLimpio = nombre.trim();
  const email = correo.trim().toLowerCase();
  if (nombreLimpio.length < 2)
    return { ok: false, error: "Escribe tu nombre para dirigirnos a ti." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Escribe una dirección de correo válida." };
  }
  if (email.endsWith("@panel.huapango.invalid")) {
    return { ok: false, error: "Usa un correo personal para crear tu cuenta de lector." };
  }
  if (clave.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const sb = lector();
  const { error: fnError } = await sb.functions.invoke("registro-lector", {
    body: { nombre: nombreLimpio, correo: email, clave },
  });

  if (fnError) {
    const contexto = (fnError as { context?: Response }).context;
    if (contexto && typeof contexto.json === "function") {
      try {
        const body = (await contexto.json()) as { error?: string };
        if (body.error) return { ok: false, error: body.error };
      } catch {
        // continúa al mensaje traducido
      }
    }
    return { ok: false, error: traducirErrorLector(fnError.message) };
  }

  const { data: loginData, error: loginError } = await sb.auth.signInWithPassword({
    email,
    password: clave,
  });
  if (loginError || !loginData.user) {
    return { ok: false, error: traducirErrorLector(loginError?.message ?? "") };
  }

  const perfil = await resolverPerfil(loginData.user);
  guardarInvitadoLocal(false);
  setCuenta({ modo: "sesion", lector: perfil });
  return { ok: true };
}

export async function salirCuenta() {
  guardarInvitadoLocal(false);
  setCuenta({ modo: "anonimo", lector: null });
  if (SUPABASE_LISTO) {
    try {
      await lector().auth.signOut({ scope: "local" });
    } catch {
      // ignora errores al cerrar sesión local
    }
  }
}

/** Sincroniza la posición de lectura si hay una cuenta iniciada; en invitado no hace red. */
export async function sincronizarProgreso(obraSlug: string, piezaSlug: string, ratio: number) {
  if (typeof window === "undefined" || !SUPABASE_LISTO) return;
  const actual = cuenta();
  if (actual.modo !== "sesion" || !actual.lector) return;
  const limpio = Math.min(1, Math.max(0, Number(ratio.toFixed(4))));
  try {
    await lector().from("progreso_lectura").upsert(
      {
        lector_id: actual.lector.id,
        obra_slug: obraSlug,
        pieza_slug: piezaSlug,
        ratio: limpio,
      },
      { onConflict: "lector_id,pieza_slug" },
    );
  } catch {
    // El lector ya guardó la posición en este dispositivo; reintentará al pasar de página.
  }
}

export async function cargarProgresoNube(): Promise<ProgresoNube[]> {
  if (typeof window === "undefined" || !SUPABASE_LISTO) return [];
  const actual = cuenta();
  if (actual.modo !== "sesion" || !actual.lector) return [];
  try {
    const { data, error } = await lector()
      .from("progreso_lectura")
      .select("obra_slug, pieza_slug, ratio, actualizado_en")
      .order("actualizado_en", { ascending: false });
    if (error || !data) return [];
    return data as ProgresoNube[];
  } catch {
    return [];
  }
}
