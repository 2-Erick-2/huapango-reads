/**
 * Datos del panel en Supabase (ADR 0020 y 0021): sesión con PIN, obras, piezas, versiones, portadas,
 * imágenes y publicación. Los mensajes de error que llegan a la pantalla están en lenguaje de
 * editorial; el detalle técnico se queda en la consola.
 */
import { panel, urlPortada } from "~/lib/supabase";
import { hashText } from "~/lib/libro/text";
import type { Pieza, PiezaStats } from "~/lib/libro/types";

// ------------------------------------------------------------------ equipo y sesión

export type Rol = "admin" | "editor";

export interface Persona {
  id: string;
  nombre: string;
  puesto: string;
  /** Correo interno de la cuenta (no es un correo real: solo identifica la cuenta del PIN) */
  cuenta: string;
}

/** Por ahora se entra con PIN (decisión de Erick, 2026-11-24); los correos reales llegan después. */
export const PERSONAS: readonly Persona[] = [
  {
    id: "luis-armando",
    nombre: "Luis Armando",
    puesto: "Dirección",
    cuenta: "luis-armando@panel.huapango.invalid",
  },
  { id: "erick", nombre: "Erick", puesto: "Edición", cuenta: "erick@panel.huapango.invalid" },
];

export interface Perfil {
  id: string;
  nombre: string;
  rol: Rol;
}

export const nombreDeRol = (rol: Rol) => (rol === "admin" ? "Administración" : "Edición");

/** Error con un mensaje listo para mostrarse. */
export class ErrorPanel extends Error {}

function explicar(error: unknown, contexto: string): ErrorPanel {
  console.error(contexto, error);
  const e = error as { code?: string; message?: string; status?: number } | null;
  const mensaje = e?.message ?? "";
  if (e?.code === "23505") return new ErrorPanel("Ya existe una obra o pieza con esa dirección.");
  if (/Solo la administración|Sin permiso|Hay piezas sin contenido|no tiene piezas/.test(mensaje))
    return new ErrorPanel(mensaje);
  if (/Failed to fetch|NetworkError|fetch/i.test(mensaje))
    return new ErrorPanel(
      "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
    );
  return new ErrorPanel(`${contexto}. Inténtalo de nuevo; si sigue fallando, avísale a Erick.`);
}

export async function entrar(persona: Persona, pin: string): Promise<void> {
  const limpio = pin.replace(/\D/g, "");
  if (limpio.length < 6) throw new ErrorPanel("Escribe tu PIN completo.");
  const { error } = await panel().auth.signInWithPassword({
    email: persona.cuenta,
    password: limpio,
  });
  if (!error) return;
  if (error.status === 429)
    throw new ErrorPanel("Demasiados intentos. Espera unos minutos y vuelve a intentarlo.");
  if (error.status === 400) throw new ErrorPanel("El PIN no es correcto.");
  throw explicar(error, "No se pudo entrar");
}

export async function salir(): Promise<void> {
  await panel().auth.signOut();
}

/** Perfil de quien tiene la sesión abierta, o null (sin sesión o sin acceso al panel). */
export async function perfilActual(): Promise<Perfil | null> {
  const { data } = await panel().auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return null;
  const { data: perfil, error } = await panel()
    .from("perfiles")
    .select("id, nombre, rol")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw explicar(error, "No se pudo leer tu cuenta");
  return (perfil as Perfil | null) ?? null;
}

// ------------------------------------------------------------------ obras

export type TipoObra = "libro" | "ensayo";
export type EstadoObra = "borrador" | "publicada" | "retirada";

export interface PiezaResumen {
  id: string;
  slug: string;
  tipo: "libro" | "complemento" | "ensayo";
  orden: number;
  titulo: string;
  firma: string | null;
  version_vigente: string | null;
  version_publicada: string | null;
  vigente: { numero: number; creado_en: string; stats: PiezaStats | null } | null;
}

export interface ObraNube {
  id: string;
  slug: string;
  tipo: TipoObra;
  titulo: string;
  subtitulo: string | null;
  autores: string[];
  sinopsis: string;
  coleccion: string | null;
  generos: string[];
  cita: string | null;
  precio_digital_mxn: number | null;
  isbn_digital: string | null;
  fecha_publicacion: string | null;
  portada_ruta: string | null;
  estado: EstadoObra;
  publicada_en: string | null;
  actualizado_en: string;
  piezas: PiezaResumen[];
}

const CAMPOS_OBRA =
  "id, slug, tipo, titulo, subtitulo, autores, sinopsis, coleccion, generos, cita, " +
  "precio_digital_mxn, isbn_digital, fecha_publicacion, portada_ruta, estado, publicada_en, actualizado_en, " +
  "piezas(id, slug, tipo, orden, titulo, firma, version_vigente, version_publicada, " +
  "vigente:versiones!piezas_version_vigente_fk(numero, creado_en, stats:documento->stats))";

export async function listarObras(): Promise<ObraNube[]> {
  const { data, error } = await panel()
    .from("obras")
    .select(CAMPOS_OBRA)
    .order("actualizado_en", { ascending: false });
  if (error) throw explicar(error, "No se pudieron leer las obras");
  const obras = (data ?? []) as unknown as ObraNube[];
  for (const o of obras) o.piezas.sort((a, b) => a.orden - b.orden);
  return obras;
}

export const portadaDe = (obra: Pick<ObraNube, "portada_ruta">) =>
  obra.portada_ruta ? urlPortada(obra.portada_ruta) : null;

/** Huella de una versión: cambia si cambia cualquier bloque. */
export const huellaDe = (pieza: Pieza) => hashText(JSON.stringify(pieza.blocks));

const piezaParaGuardar = (pieza: Pieza, nota: string | null) => ({
  slug: pieza.slug,
  tipo: pieza.kind,
  titulo: pieza.title,
  firma: pieza.credit,
  documento: pieza,
  huella: huellaDe(pieza),
  nota,
});

export interface DatosObra {
  slug: string;
  tipo: TipoObra;
  titulo: string;
  autores: string[];
  sinopsis: string;
}

/** Crea la obra con todas sus piezas en una sola operación (si algo falla, no queda nada a medias). */
export async function crearObra(
  datos: DatosObra,
  piezas: readonly Pieza[],
  nota: string,
): Promise<string> {
  const { data, error } = await panel().rpc("crear_obra", {
    p_obra: datos,
    p_piezas: piezas.map((p) => piezaParaGuardar(p, nota)),
  });
  if (error) throw explicar(error, "No se pudo crear la obra");
  return data as string;
}

export async function agregarPieza(obraId: string, pieza: Pieza): Promise<string> {
  const { data, error } = await panel().rpc("agregar_pieza", {
    p_obra: obraId,
    p_pieza: piezaParaGuardar(pieza, "Pieza nueva"),
  });
  if (error) throw explicar(error, "No se pudo agregar la pieza");
  return data as string;
}

export async function actualizarDatosObra(
  id: string,
  datos: Partial<
    Pick<
      ObraNube,
      | "titulo"
      | "subtitulo"
      | "autores"
      | "sinopsis"
      | "coleccion"
      | "generos"
      | "cita"
      | "precio_digital_mxn"
      | "isbn_digital"
      | "fecha_publicacion"
    >
  >,
): Promise<void> {
  const { error } = await panel().from("obras").update(datos).eq("id", id);
  if (error) throw explicar(error, "No se pudieron guardar los datos de la obra");
}

export async function publicarObra(id: string): Promise<void> {
  const { error } = await panel().rpc("publicar_obra", { p_obra: id });
  if (error) throw explicar(error, "No se pudo publicar");
}

export async function retirarObra(id: string): Promise<void> {
  const { error } = await panel().from("obras").update({ estado: "retirada" }).eq("id", id);
  if (error) throw explicar(error, "No se pudo retirar la obra");
}

export async function borrarObra(id: string): Promise<void> {
  const { error } = await panel().from("obras").delete().eq("id", id);
  if (error) throw explicar(error, "No se pudo borrar la obra");
}

// ------------------------------------------------------------------ piezas y versiones

export interface PiezaAbierta {
  id: string;
  obra: { id: string; slug: string; titulo: string; tipo: TipoObra; estado: EstadoObra };
  pieza: Pieza;
  numero: number;
  guardadaEn: string;
}

export async function abrirPieza(slug: string): Promise<PiezaAbierta | null> {
  const { data, error } = await panel()
    .from("piezas")
    .select(
      "id, obra:obras(id, slug, titulo, tipo, estado), vigente:versiones!piezas_version_vigente_fk(numero, creado_en, documento)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw explicar(error, "No se pudo abrir la pieza");
  if (!data) return null;
  const fila = data as unknown as {
    id: string;
    obra: PiezaAbierta["obra"];
    vigente: { numero: number; creado_en: string; documento: Pieza } | null;
  };
  if (!fila.vigente) throw new ErrorPanel("Esta pieza todavía no tiene contenido guardado.");
  return {
    id: fila.id,
    obra: fila.obra,
    pieza: fila.vigente.documento,
    numero: fila.vigente.numero,
    guardadaEn: fila.vigente.creado_en,
  };
}

/** Guarda una versión nueva (las anteriores se conservan). Devuelve su número. */
export async function guardarVersion(
  piezaId: string,
  pieza: Pieza,
  nota: string | null,
): Promise<number> {
  const { data, error } = await panel()
    .from("versiones")
    .insert({ pieza_id: piezaId, documento: pieza, huella: huellaDe(pieza), nota })
    .select("numero")
    .single();
  if (error) throw explicar(error, "No se pudo guardar la versión");
  const { error: e2 } = await panel()
    .from("piezas")
    .update({ titulo: pieza.title, firma: pieza.credit })
    .eq("id", piezaId);
  if (e2) throw explicar(e2, "Se guardó el texto, pero no el título de la pieza");
  return (data as { numero: number }).numero;
}

export interface VersionResumen {
  id: string;
  numero: number;
  nota: string | null;
  creado_en: string;
  stats: PiezaStats | null;
  autor: { nombre: string } | null;
}

/** Historial de versiones inmutables de una pieza, de la más reciente a la primera. */
export async function listarVersiones(piezaId: string): Promise<VersionResumen[]> {
  const { data, error } = await panel()
    .from("versiones")
    .select("id, numero, nota, creado_en, stats:documento->stats, autor:perfiles(nombre)")
    .eq("pieza_id", piezaId)
    .order("numero", { ascending: false });
  if (error) throw explicar(error, "No se pudo leer el historial de versiones");
  return (data ?? []) as unknown as VersionResumen[];
}

/** Documento completo de una versión guardada (para consultarla o restaurarla). */
export async function cargarVersion(versionId: string): Promise<Pieza> {
  const { data, error } = await panel()
    .from("versiones")
    .select("documento")
    .eq("id", versionId)
    .single();
  if (error || !data) throw explicar(error, "No se pudo abrir esa versión");
  return (data as { documento: Pieza }).documento;
}

// ------------------------------------------------------------------ archivos

const TIPOS_PORTADA = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PORTADA = 10 * 1024 * 1024;

async function medidas(file: Blob): Promise<{ ancho: number; alto: number } | null> {
  try {
    const bmp = await createImageBitmap(file);
    const m = { ancho: bmp.width, alto: bmp.height };
    bmp.close();
    return m;
  } catch {
    return null;
  }
}

async function sha256(file: Blob): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function registrarArchivo(
  obraId: string,
  carpeta: "originales" | "imagenes" | "portadas",
  ruta: string,
  file: Blob,
  nombre: string,
  dims: { ancho: number; alto: number } | null,
): Promise<string> {
  const { data, error } = await panel()
    .from("archivos")
    .upsert(
      {
        obra_id: obraId,
        carpeta,
        ruta,
        nombre_original: nombre,
        tipo_mime: file.type || "application/octet-stream",
        bytes: file.size,
        sha256: await sha256(file),
        ancho: dims?.ancho ?? null,
        alto: dims?.alto ?? null,
      },
      { onConflict: "carpeta,ruta" },
    )
    .select("id")
    .single();
  if (error) throw explicar(error, "No se pudo registrar el archivo");
  return (data as { id: string }).id;
}

/** Revisa una portada antes de subirla. Devuelve el problema o null si está bien. */
export function problemaDePortada(file: File): string | null {
  if (!TIPOS_PORTADA.has(file.type)) return "La portada debe ser JPG, PNG o WebP.";
  if (file.size > MAX_PORTADA) return "La portada pesa más de 10 MB. Expórtala más ligera.";
  return null;
}

export async function subirPortada(
  obra: Pick<ObraNube, "id" | "slug">,
  file: File,
): Promise<string> {
  const problema = problemaDePortada(file);
  if (problema) throw new ErrorPanel(problema);
  const dims = await medidas(file);
  if (dims && dims.ancho < 400)
    throw new ErrorPanel("La portada es muy pequeña: necesita al menos 400 píxeles de ancho.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const ruta = `${obra.slug}/${Date.now()}.${ext}`;
  const { error } = await panel().storage.from("portadas").upload(ruta, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) throw explicar(error, "No se pudo subir la portada");
  await registrarArchivo(obra.id, "portadas", ruta, file, file.name, dims);
  const { error: e2 } = await panel()
    .from("obras")
    .update({ portada_ruta: ruta })
    .eq("id", obra.id);
  if (e2) throw explicar(e2, "Se subió la portada, pero no se pudo asignar");
  return ruta;
}

function dataUrlABlob(dataUrl: string): Blob {
  const [cabecera, base64 = ""] = dataUrl.split(",");
  const tipo = /data:([^;]+)/.exec(cabecera ?? "")?.[1] ?? "application/octet-stream";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

/** Sube las imágenes de una obra importada (nombre con huella: si ya existe, no se duplica). */
export async function subirImagenes(
  obra: { id: string; slug: string },
  imagenes: Record<string, string>,
): Promise<void> {
  for (const [nombre, dataUrl] of Object.entries(imagenes)) {
    const blob = dataUrlABlob(dataUrl);
    const ruta = `${obra.slug}/${nombre}`;
    const { error } = await panel().storage.from("imagenes").upload(ruta, blob, {
      contentType: blob.type,
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw explicar(error, `No se pudo subir la imagen ${nombre}`);
    await registrarArchivo(obra.id, "imagenes", ruta, blob, nombre, await medidas(blob));
  }
}

/** Sube una imagen PNG nueva desde el editor y devuelve su enlace temporal para mostrarla al instante. */
export async function subirImagenEditor(
  obra: { id: string; slug: string },
  asset: string,
  file: File,
  dims: { ancho: number; alto: number },
): Promise<{ asset: string; url: string }> {
  const ruta = `${obra.slug}/${asset}`;
  const { error } = await panel().storage.from("imagenes").upload(ruta, file, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw explicar(error, "No se pudo subir la imagen");
  await registrarArchivo(obra.id, "imagenes", ruta, file, file.name, dims);
  const { data, error: e2 } = await panel().storage.from("imagenes").createSignedUrl(ruta, 3600);
  if (e2 || !data?.signedUrl) throw explicar(e2, "Se subió la imagen, pero no se pudo mostrar");
  return { asset, url: data.signedUrl };
}

/** Guarda el EPUB original y el informe de la importación. */
export async function registrarImportacion(
  obra: { id: string; slug: string },
  originales: readonly File[],
  informe: unknown,
  mapeo: unknown,
): Promise<void> {
  let archivoId: string | null = null;
  for (const file of originales) {
    const seguro = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
    const ruta = `${obra.slug}/${Date.now()}-${seguro}`;
    const { error } = await panel().storage.from("originales").upload(ruta, file, {
      contentType: "application/epub+zip",
    });
    if (error) throw explicar(error, "No se pudo guardar el archivo original");
    archivoId ??= await registrarArchivo(obra.id, "originales", ruta, file, file.name, null);
  }
  const { error } = await panel()
    .from("importaciones")
    .insert({ obra_id: obra.id, archivo_id: archivoId, estado: "aplicada", informe, mapeo });
  if (error) throw explicar(error, "No se pudo registrar la importación");
}

/** URLs temporales (1 hora) de las imágenes privadas de una obra, por nombre de archivo. */
export async function urlsDeImagenes(
  obraSlug: string,
  nombres: readonly string[],
): Promise<Record<string, string>> {
  if (nombres.length === 0) return {};
  const { data, error } = await panel()
    .storage.from("imagenes")
    .createSignedUrls(
      nombres.map((n) => `${obraSlug}/${n}`),
      3600,
    );
  if (error) throw explicar(error, "No se pudieron cargar las imágenes");
  const out: Record<string, string> = {};
  for (const fila of data) {
    const nombre = fila.path?.split("/").pop();
    if (nombre && fila.signedUrl) out[nombre] = fila.signedUrl;
  }
  return out;
}

/** Token de la sesión, para llamar al importador del servidor. */
export async function tokenDeSesion(): Promise<string> {
  const { data } = await panel().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ErrorPanel("Tu sesión terminó. Vuelve a entrar con tu PIN.");
  return token;
}
