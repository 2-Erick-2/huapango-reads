/**
 * Importar y revisar (ADR 0021), lado del servidor. Reutiliza TAL CUAL el importador verificado de
 * `scripts/ingesta/` (ADR 0016): los EPUB subidos se escriben en una carpeta temporal junto con un
 * mapeo armado con las decisiones que la persona tomó en pantalla, y se corre `importarObra`.
 *
 * - `analizar`: lee cada EPUB y propone el papel de cada estilo de párrafo y de cada imagen, y dónde
 *   empieza cada pieza (un EPUB puede traer el libro completo: prólogo, nota, cuento, epílogo).
 * - `revisar`: arma el mapeo con las decisiones, importa, verifica y devuelve las piezas listas.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  extractAtoms,
  type Atom,
  type ParaAtom,
  type Warning,
} from "../../scripts/ingesta/atoms.ts";
import { readEpub, type EpubPackage } from "../../scripts/ingesta/epub.ts";
import type {
  Colocacion,
  FuenteMapeo,
  ImagenMapeo,
  Mapeo,
  PiezaMapeo,
  RolClase,
  RolImagen,
  RolTexto,
} from "../../scripts/ingesta/mapeo.ts";
import { normalizar, textoDe } from "../../scripts/ingesta/normalizar.ts";
import { importarObra } from "../../scripts/ingesta/obra.ts";
import type { Pieza } from "../lib/libro/types.ts";

/** Tamaño máximo de un EPUB (igual que la carpeta de originales en Supabase). */
export const MAX_EPUB_BYTES = 50 * 1024 * 1024;

export interface FuenteSubida {
  nombre: string;
  datos: Buffer;
}

export type RolEstilo = RolClase | "auto";

export interface EstiloAnalizado {
  clase: string;
  parrafos: number;
  /** Fracción de sus párrafos centrados (0..1) */
  centrados: number;
  largoMedio: number;
  ejemplo: string;
  propuesto: RolEstilo;
}

export interface ImagenAnalizada {
  src: string;
  anchoPct: number | null;
  /** La imagen como data URL, para mostrarla en la revisión */
  vista: string;
  propuesto: RolImagen;
  /** Rol "titulo" o "capitulo": el texto propuesto */
  texto: string;
  alt: string;
}

/** El documento en orden: párrafos (con su número) e imágenes, para elegir dónde empieza cada pieza. */
export type BloqueAnalizado =
  | { tipo: "texto"; i: number; texto: string; clases: string[]; centrado: boolean }
  | { tipo: "imagen"; src: string };

export interface PiezaPropuesta {
  /** Número del párrafo donde empieza */
  inicio: number;
  titulo: string;
}

/** Párrafo con un papel propio, distinto al de su estilo (p. ej. "Por Mercedes Varela" es firma). */
export interface TextoAnalizado {
  texto: string;
  propuesto: RolTexto;
}

export interface FuenteAnalizada {
  archivo: string;
  textos: TextoAnalizado[];
  titulo: string | null;
  parrafos: number;
  palabras: number;
  estilos: EstiloAnalizado[];
  imagenes: ImagenAnalizada[];
  bloques: BloqueAnalizado[];
  piezas: PiezaPropuesta[];
}

/** Clases genéricas de InDesign que llevan casi todos los párrafos: no dicen nada del papel. */
const GENERICAS = new Set(["P-rrafo-b-sico", "Basic-Paragraph", "Normal"]);

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const TERMINA_EN_PUNTO = /[.!?…»"”)\]:;]$/u;

/** "Por Mercedes Varela": firma de un texto, aunque su estilo sea el de un título. */
export const ES_FIRMA = /^(?:[Pp]or|[Dd]e)\s+\p{Lu}[\p{L}.\s-]{2,50}$/u;

/** Cierres que la editorial usa al final de un texto: siempre son ornamento, no título ni párrafo. */
export const CIERRE = /^(fin|\*(\s*\*){0,4})$/iu;

function atomosDe(epub: EpubPackage): Atom[] {
  const warnings: Warning[] = [];
  return epub.docs.flatMap((doc) => extractAtoms(doc, warnings));
}

const parrafosDe = (atomos: readonly Atom[]) =>
  atomos.filter((a): a is ParaAtom => a.kind === "p" && a.text !== "");

/** Propone el papel de un estilo según cómo se ven sus párrafos. "auto" deja la regla general. */
export function proponerEstilo(e: {
  parrafos: number;
  centrados: number;
  largoMedio: number;
  esPrimero: boolean;
  sinPunto: boolean;
}): RolEstilo {
  const corto = e.largoMedio <= 60;
  if (corto && e.esPrimero && e.sinPunto && e.parrafos <= 3) return "titulo1";
  if (corto && e.sinPunto && e.centrados >= 0.9 && e.parrafos <= 40)
    return e.esPrimero ? "titulo1" : "titulo2";
  return "auto";
}

const PALABRAS_CON_ACENTO: Record<string, string> = {
  prologo: "prólogo",
  epilogo: "epílogo",
  analisis: "análisis",
  introduccion: "introducción",
  presentacion: "presentación",
  capitulo: "capítulo",
  dedicatoria: "dedicatoria",
};

/** "nota_del_autor.jpg" → "Nota del autor"; "prologo.jpg" → "Prólogo". */
export function tituloDeArchivo(src: string): string {
  const base = (src.split("/").pop() ?? src).replace(/\.[^.]+$/, "");
  const palabras = base
    .replace(/[_-]+/g, " ")
    .replace(/\d+/g, "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => PALABRAS_CON_ACENTO[p] ?? p);
  const texto = palabras.join(" ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const ES_TITULO =
  /pr[oó]logo|ep[ií]logo|nota_?del|introducci|presentaci|an[aá]lisis|dedicatoria|agradecimiento/i;

/** Propone el papel de una imagen por su nombre, su ancho y su posición. */
export function proponerImagen(
  src: string,
  anchoPct: number | null,
  esPrimera: boolean,
): RolImagen {
  const nombre = (src.split("/").pop() ?? src).toLowerCase();
  if (/(^|[^a-z])logo|isotipo/.test(nombre)) return "ignorar";
  if (ES_TITULO.test(nombre)) return "titulo";
  if (esPrimera && (anchoPct === null || anchoPct >= 80)) return "portadilla";
  if (anchoPct !== null && anchoPct <= 40) return "divisor";
  return "ilustracion";
}

function escribirTemporal(fuentes: readonly FuenteSubida[]): { dir: string; rutas: string[] } {
  const dir = join(tmpdir(), `hr-importar-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  const rutas = fuentes.map((f, i) => {
    const ruta = join(dir, `fuente-${i + 1}.epub`);
    writeFileSync(ruta, f.datos);
    return ruta;
  });
  return { dir, rutas };
}

export function analizar(fuentes: readonly FuenteSubida[]): FuenteAnalizada[] {
  const { dir, rutas } = escribirTemporal(fuentes);
  try {
    return fuentes.map((fuente, n) => {
      const epub = readEpub(rutas[n] ?? "");
      const atomos = atomosDe(epub);
      const parrafos = parrafosDe(atomos);
      const primero = parrafos[0];

      const porClase = new Map<string, ParaAtom[]>();
      for (const p of parrafos) {
        for (const c of p.classes) {
          if (GENERICAS.has(c)) continue;
          const lista = porClase.get(c) ?? [];
          lista.push(p);
          porClase.set(c, lista);
        }
      }
      const estilos: EstiloAnalizado[] = [...porClase.entries()].map(([clase, ps]) => {
        const centrados = ps.filter((p) => p.align === "center").length / ps.length;
        const largoMedio = Math.round(ps.reduce((s, p) => s + p.text.length, 0) / ps.length);
        const datos = { parrafos: ps.length, centrados, largoMedio };
        return {
          clase,
          ...datos,
          ejemplo: (ps[0]?.text ?? "").slice(0, 90),
          propuesto: proponerEstilo({
            ...datos,
            esPrimero: primero !== undefined && ps.includes(primero),
            sinPunto: ps.every((p) => !TERMINA_EN_PUNTO.test(p.text)),
          }),
        };
      });
      estilos.sort((a, b) => b.parrafos - a.parrafos);

      const vistas = new Set<string>();
      const imagenes: ImagenAnalizada[] = [];
      const bloques: BloqueAnalizado[] = [];
      let i = 0;
      for (const a of atomos) {
        if (a.kind === "p") {
          if (a.text === "") continue;
          bloques.push({
            tipo: "texto",
            i,
            texto: a.text.slice(0, 140),
            clases: a.classes.filter((c) => !GENERICAS.has(c)),
            centrado: a.align === "center",
          });
          i += 1;
          continue;
        }
        bloques.push({ tipo: "imagen", src: a.src });
        if (vistas.has(a.src)) continue;
        vistas.add(a.src);
        const { data } = epub.readResource(a.doc, a.src);
        const ext = a.src.split(".").pop()?.toLowerCase() ?? "";
        const propuesto = proponerImagen(a.src, a.widthPct, imagenes.length === 0);
        imagenes.push({
          src: a.src,
          anchoPct: a.widthPct,
          vista: `data:${MIME[ext] ?? "application/octet-stream"};base64,${data.toString("base64")}`,
          propuesto,
          texto: propuesto === "titulo" ? tituloDeArchivo(a.src) : "",
          alt: a.alt,
        });
      }

      // Piezas propuestas: el inicio del documento y cada texto que sigue a una imagen-título.
      const piezas: PiezaPropuesta[] = [{ inicio: 0, titulo: "" }];
      let pendiente: string | null = null;
      for (const b of bloques) {
        if (b.tipo === "imagen") {
          const img = imagenes.find((x) => x.src === b.src);
          if (img?.propuesto === "titulo") pendiente = img.texto;
          continue;
        }
        if (pendiente !== null) {
          if (b.i === 0) {
            const p0 = piezas[0];
            if (p0) p0.titulo = pendiente;
          } else piezas.push({ inicio: b.i, titulo: pendiente });
          pendiente = null;
        }
      }

      const textos: TextoAnalizado[] = [];
      for (const p of parrafos) {
        if (textos.some((t) => t.texto === p.text)) continue;
        if (ES_FIRMA.test(p.text)) textos.push({ texto: p.text, propuesto: "firma" });
        else if (CIERRE.test(p.text)) textos.push({ texto: p.text, propuesto: "ornamento" });
      }

      return {
        archivo: fuente.nombre,
        textos,
        titulo: epub.title,
        parrafos: parrafos.length,
        palabras: parrafos.reduce((s, p) => s + p.text.split(/\s+/).filter(Boolean).length, 0),
        estilos,
        imagenes,
        bloques,
        piezas,
      };
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ revisar

export interface DecisionImagen {
  rol: RolImagen;
  alt?: string;
  /** Imagen-título o tarjeta de capítulo: el texto que dice */
  texto?: string;
  /**
   * Número del párrafo ANTES del cual va la imagen. Sin él, se ubica donde aparece en el EPUB (que
   * InDesign a veces exporta fuera de lugar). En una imagen-título, el inicio de la pieza que titula.
   */
  antes?: number;
}

export interface DecisionPieza {
  /** Número del párrafo donde empieza */
  inicio: number;
  titulo: string;
  slug: string;
  tipo: "libro" | "complemento";
  capitular: boolean;
}

export interface DecisionFuente {
  estilos: Record<string, RolEstilo>;
  /** Papel de párrafos concretos (tiene prioridad sobre su estilo) */
  textos?: Record<string, RolTexto | "auto">;
  imagenes: Record<string, DecisionImagen>;
  piezas: DecisionPieza[];
}

export interface PeticionRevisar {
  obra: string;
  tipoObra: "libro" | "ensayo";
  fuentes: DecisionFuente[];
}

export interface ResultadoRevision {
  ok: boolean;
  piezas: Pieza[];
  /** Nombre del archivo de imagen -> data URL */
  imagenes: Record<string, string>;
  comprobaciones: Array<{ nombre: string; ok: boolean; grave: boolean; detalle: string }>;
  avisos: string[];
  errores: string[];
}

/** Error que se explica a la persona tal cual. */
export class ErrorDeRevision extends Error {}

const empiezaCon = (textos: readonly string[], t: string) =>
  textos.filter((x) => x.startsWith(t)).length;

function fuenteMapeo(decision: DecisionFuente, archivo: string): FuenteMapeo {
  const clases: Record<string, RolClase> = {};
  for (const [clase, rol] of Object.entries(decision.estilos))
    if (rol !== "auto") clases[clase] = rol;
  const imagenes: Record<string, ImagenMapeo> = {};
  for (const [src, d] of Object.entries(decision.imagenes)) {
    const alt = d.alt?.trim();
    const texto = d.texto?.trim();
    if ((d.rol === "titulo" || d.rol === "capitulo") && !texto)
      throw new ErrorDeRevision(
        `Escribe el texto de la imagen «${src.split("/").pop() ?? src}» (${d.rol === "titulo" ? "título" : "capítulo"}).`,
      );
    imagenes[src] = { rol: d.rol, ...(alt ? { alt } : {}), ...(texto ? { texto } : {}) };
  }
  const textos: Record<string, RolTexto> = {};
  for (const [texto, rol] of Object.entries(decision.textos ?? {}))
    if (rol !== "auto") textos[texto] = rol;
  return { archivo, contrastes: [], clases, textos, imagenes, piezas: [] };
}

/** Arma las piezas del mapeo (inicio, fin, portadilla e imágenes) de una fuente. */
export function piezasDeFuente(
  atomos: readonly Atom[],
  fuente: FuenteMapeo,
  decisiones: readonly DecisionPieza[],
  nombre: string,
  ubicaciones: Readonly<Record<string, number | undefined>> = {},
): PiezaMapeo[] {
  if (decisiones.length === 0) throw new ErrorDeRevision(`«${nombre}» no tiene ninguna pieza.`);
  const parrafos = parrafosDe(atomos);
  for (const p of parrafos)
    if (CIERRE.test(p.text) && fuente.textos[p.text] === undefined)
      fuente.textos[p.text] = "ornamento";
  const warnings: Warning[] = [];
  const flujo = normalizar(atomos, fuente, warnings);
  const textos = flujo.drafts.filter((d) => d.type !== "spacer").map(textoDe);
  const ordenadas = [...decisiones].sort((a, b) => a.inicio - b.inicio);

  // Índice (en `textos`) del primer bloque de cada pieza
  const inicios = ordenadas.map((d) => {
    const p = parrafos[d.inicio];
    if (!p) throw new ErrorDeRevision(`«${d.titulo}» empieza en un párrafo que no existe.`);
    const idx = textos.indexOf(p.text);
    if (idx < 0)
      throw new ErrorDeRevision(
        `«${d.titulo}» empieza en un párrafo que marcaste para ignorar o que se une a una firma. Elige otro inicio.`,
      );
    if (empiezaCon(textos, p.text) !== 1)
      throw new ErrorDeRevision(
        `El párrafo donde empieza «${d.titulo}» se repite en el texto. Elige el párrafo siguiente como inicio.`,
      );
    return idx;
  });
  if ((inicios[0] ?? 0) > 0)
    throw new ErrorDeRevision(
      `En «${nombre}» hay texto antes de la primera pieza: haz que empiece desde el primer párrafo o marca ese texto para ignorar.`,
    );

  // Posición de cada átomo de párrafo visible en `textos` (para saber a qué pieza pertenece cada imagen)
  const piezaDeTexto = (idx: number) => {
    let k = 0;
    inicios.forEach((ini, j) => {
      if (idx >= ini) k = j;
    });
    return k;
  };
  const colocar: Colocacion[][] = ordenadas.map(() => []);
  const portadillas: Array<string | undefined> = ordenadas.map(() => undefined);
  const usadas = new Set<string>();
  const visibles = (desde: number, paso: 1 | -1) => {
    for (let j = desde; j >= 0 && j < atomos.length; j += paso) {
      const a = atomos[j];
      if (a?.kind === "p" && a.text !== "" && textos.includes(a.text)) return a;
    }
    return undefined;
  };

  atomos.forEach((a, j) => {
    if (a.kind !== "img" || usadas.has(a.src)) return;
    const rol = fuente.imagenes[a.src]?.rol;
    if (rol === undefined || rol === "ignorar") return;
    usadas.add(a.src);
    const fijada = ubicaciones[a.src];
    const elegido = fijada === undefined ? undefined : parrafos[fijada];
    if (fijada !== undefined && (!elegido || !textos.includes(elegido.text)))
      throw new ErrorDeRevision(
        `La imagen «${a.src.split("/").pop() ?? a.src}» va antes de un párrafo que se ignora o no existe. Elige otro.`,
      );
    const siguiente = elegido ?? visibles(j + 1, 1);
    const anterior = elegido ? undefined : visibles(j - 1, -1);
    if (rol === "titulo") {
      // Una imagen-título se vuelve el título de la pieza que empieza justo después.
      if (siguiente) {
        const k = inicios.indexOf(textos.indexOf(siguiente.text));
        if (k >= 0) portadillas[k] = a.src;
      }
      return;
    }
    if (siguiente && empiezaCon(textos, siguiente.text) === 1) {
      colocar[piezaDeTexto(textos.indexOf(siguiente.text))]?.push({
        imagen: a.src,
        antes: siguiente.text,
      });
    } else if (anterior && empiezaCon(textos, anterior.text) === 1) {
      colocar[piezaDeTexto(textos.indexOf(anterior.text))]?.push({
        imagen: a.src,
        despues: anterior.text,
      });
    } else {
      colocar[ordenadas.length - 1]?.push({ imagen: a.src, alFinal: true });
    }
  });

  return ordenadas.map((d, k) => {
    const inicio = inicios[k] ?? 0;
    const fin = (inicios[k + 1] ?? textos.length) - 1;
    const desde = textos[inicio] ?? "";
    const hasta = textos[fin] ?? "";
    const primerFin = textos.findIndex((t, idx) => idx >= inicio && t.startsWith(hasta));
    if (primerFin !== fin)
      throw new ErrorDeRevision(
        `No puedo saber dónde termina «${d.titulo}»: su último párrafo se repite antes. Mueve el inicio de la pieza siguiente.`,
      );
    const portadilla = portadillas[k];
    const lista = colocar[k] ?? [];
    return {
      slug: d.slug,
      tipo: d.tipo,
      titulo: d.titulo,
      desde,
      hasta,
      ...(portadilla ? { portadilla } : {}),
      ...(d.capitular ? { capitular: true } : {}),
      ...(lista.length > 0 ? { colocar: lista } : {}),
    };
  });
}

export function revisar(
  fuentes: readonly FuenteSubida[],
  peticion: PeticionRevisar,
): ResultadoRevision {
  if (fuentes.length !== peticion.fuentes.length)
    throw new ErrorDeRevision("Cada archivo necesita sus decisiones.");
  const libros = peticion.fuentes.flatMap((f) => f.piezas).filter((p) => p.tipo === "libro");
  if (libros.length !== 1)
    throw new ErrorDeRevision(
      libros.length === 0
        ? "Marca cuál pieza es la obra principal."
        : "Solo una pieza puede ser la obra principal.",
    );
  const { dir, rutas } = escribirTemporal(fuentes);
  try {
    const mapeo: Mapeo = {
      obra: peticion.obra,
      fuentes: peticion.fuentes.map((decision, i) => {
        const archivo = `fuente-${i + 1}.epub`;
        const nombre = fuentes[i]?.nombre ?? archivo;
        const fuente = fuenteMapeo(decision, archivo);
        const atomos = atomosDe(readEpub(rutas[i] ?? ""));
        // Toda imagen del EPUB necesita un papel: lo que la pantalla no decidió, se ignora.
        for (const a of atomos)
          if (a.kind === "img" && fuente.imagenes[a.src] === undefined)
            fuente.imagenes[a.src] = { rol: "ignorar" };
        const ubicaciones = Object.fromEntries(
          Object.entries(decision.imagenes).map(([src, d]) => [src, d.antes]),
        );
        fuente.piezas = piezasDeFuente(atomos, fuente, decision.piezas, nombre, ubicaciones);
        return fuente;
      }),
    };
    const mapeoPath = join(dir, "mapeo.json");
    writeFileSync(mapeoPath, JSON.stringify(mapeo));
    let res;
    try {
      res = importarObra(mapeoPath);
    } catch (error) {
      throw new ErrorDeRevision(
        `No se pudo armar la obra con estas decisiones. ${error instanceof Error ? error.message : ""}`.trim(),
      );
    }

    const piezas = res.piezas.map((p) =>
      peticion.tipoObra === "ensayo" && p.kind === "libro" ? { ...p, kind: "ensayo" as const } : p,
    );
    const imagenes: Record<string, string> = {};
    for (const [nombre, datos] of res.assets) {
      const ext = nombre.split(".").pop()?.toLowerCase() ?? "";
      imagenes[nombre] =
        `data:${MIME[ext] ?? "application/octet-stream"};base64,${datos.toString("base64")}`;
    }
    const nombreReal = (s: string) =>
      s.replace(/fuente-(\d+)\.epub/g, (m, n: string) => fuentes[Number(n) - 1]?.nombre ?? m);
    const tituloDe = (slug: string) => piezas.find((p) => p.slug === slug)?.title ?? slug;
    return {
      ok: res.ok,
      piezas,
      imagenes,
      comprobaciones: res.checks.map((c) => ({
        nombre: nombreReal(c.nombre),
        ok: c.ok,
        grave: c.nivel === "error",
        detalle: nombreReal(c.detalle),
      })),
      avisos: res.issues
        .filter((x) => x.issue.level === "warning")
        .map((x) => `${tituloDe(x.slug)}: ${x.issue.message}`),
      errores: res.issues
        .filter((x) => x.issue.level === "error")
        .map((x) => `${tituloDe(x.slug)}: ${x.issue.message}`),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
