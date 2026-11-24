/**
 * Arma los datos del libro impreso (plantilla "Cuentos a todas partes", ADR 0023) a partir de las
 * piezas en formato canónico. Lógica pura: no lee archivos ni compila; eso es de `compilar.ts`.
 *
 * Medidas del impreso real (docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md):
 * página 5.5 × 8.5 in, márgenes interior 70 pt / exterior 76 pt, superior 106 pt, inferior 76 pt.
 */
import type { Align, Block, ImageBlock, Inline, Pieza } from "~/lib/libro/types";

export type MargenesLibro = "clasico" | "compacto";

/** Medidas útiles de la caja de texto, en puntos, según el estilo de márgenes elegido. */
export function cajaDe(margenes: MargenesLibro = "clasico"): { ancho: number; alto: number } {
  return margenes === "compacto"
    ? { ancho: 396 - 54 - 50, alto: 612 - 78 - 58 }
    : { ancho: 396 - 70 - 76, alto: 612 - 106 - 76 };
}

/** Ancho y alto útiles de la caja de texto por omisión (clásico Huapango), en puntos */
export const CAJA = cajaDe("clasico");
/** Resolución mínima recomendada para imprimir */
export const PPP_MINIMO = 300;

export interface Run {
  t: string;
  i?: true;
  b?: true;
  sc?: true;
}

export type BloqueImpreso =
  | { tipo: "titulo"; nivel: 1 | 2 | 3; runs: Run[] }
  | {
      tipo: "parrafo";
      runs: Run[];
      alinear: "left" | "center" | "right" | "justify";
      sangria: boolean;
      /** Primera letra de un párrafo con capitular (se quita de `runs`) */
      capitular: string | null;
    }
  | { tipo: "firma"; runs: Run[]; credito: string | null }
  | { tipo: "ornamento"; texto: string }
  | { tipo: "espacio" }
  | {
      tipo: "imagen";
      ruta: string;
      /** Medidas en puntos ya calculadas para la caja de texto */
      w: number;
      h: number;
      /** Recorte vertical: alto total de la imagen y desplazamiento hacia arriba */
      hTotal: number | null;
      dy: number;
    };

export interface PiezaImpresa {
  tipo: Pieza["kind"];
  titulo: string;
  /** La pieza abre con una portadilla de página completa (imagen grande + título): el texto sigue en la página siguiente */
  conPortadilla: boolean;
  apertura: BloqueImpreso[];
  cuerpo: BloqueImpreso[];
}

export interface DatosLibro {
  titulo: string;
  autor: string;
  legal: string[];
  colofon: string[];
  guiones: boolean;
  multiploDe4: boolean;
  margenes?: MargenesLibro;
  /** Páginas que se agregan al final (blancas + la del colofón). Lo calcula `compilar.ts`. */
  saltos: number;
  piezas: PiezaImpresa[];
}

export interface OpcionesLibro {
  titulo: string;
  autor: string;
  legal: string;
  colofon: string;
  guiones: boolean;
  multiploDe4: boolean;
  margenes?: MargenesLibro;
}

export interface InfoImagen {
  /** Ancho y alto del archivo en píxeles */
  ancho: number;
  alto: number;
}

export interface AvisoImagen {
  pieza: string;
  imagen: string;
  ppp: number;
}

const ALINEAR: Record<Align, "left" | "center" | "right" | "justify"> = {
  start: "left",
  center: "center",
  end: "right",
  justify: "justify",
};

/** Inserta puntos de quiebre suaves en palabras o enlaces extra largos (> 25 caracteres) sin alterar palabras normales. */
function partirTokensLargos(texto: string): string {
  return texto.replace(/\S{26,}/g, (token) => {
    const chars = Array.from(token);
    const partes: string[] = [];
    for (let i = 0; i < chars.length; i += 20) partes.push(chars.slice(i, i + 20).join(""));
    return partes.join("\u200B");
  });
}

/** Texto en línea del formato canónico → tramos con su formato, para la plantilla. */
export function aRuns(nodos: readonly Inline[], f: Omit<Run, "t"> = {}): Run[] {
  return nodos.flatMap((n): Run[] => {
    if (typeof n === "string") return n === "" ? [] : [{ t: partirTokensLargos(n), ...f }];
    if ("em" in n) return aRuns(n.em, { ...f, i: true });
    if ("strong" in n) return aRuns(n.strong, { ...f, b: true });
    return aRuns(n.smallCaps, { ...f, sc: true });
  });
}

/** Quita la primera letra de los tramos (para la capitular). */
function sinPrimeraLetra(runs: Run[]): { letra: string; runs: Run[] } {
  const primero = runs[0];
  if (!primero) return { letra: "", runs };
  const [letra = ""] = Array.from(primero.t);
  const resto = primero.t.slice(letra.length);
  return { letra, runs: resto ? [{ ...primero, t: resto }, ...runs.slice(1)] : runs.slice(1) };
}

/** Medidas en la caja y resolución efectiva de una imagen. */
export function medirImagen(
  b: Pick<ImageBlock, "role" | "widthPct" | "crop">,
  info: InfoImagen,
  caja: { ancho: number; alto: number } = CAJA,
): { w: number; h: number; hTotal: number | null; dy: number; ppp: number } {
  const fraccion = b.role === "portadilla" ? 1 : Math.min(1, (b.widthPct ?? 100) / 100);
  let w = caja.ancho * fraccion;
  const banda = b.crop ? b.crop.to - b.crop.from : 1;
  // Alto máximo: 70 % de la caja (una portadilla puede ocupar más, porque va sola en su página)
  const maxAlto = caja.alto * (b.role === "portadilla" ? 0.78 : 0.7);
  const altoVisible = (w * info.alto * banda) / info.ancho;
  if (altoVisible > maxAlto) w *= maxAlto / altoVisible;
  const hTotal = (w * info.alto) / info.ancho;
  const h = hTotal * banda;
  const ppp = Math.round(info.ancho / (w / 72));
  return {
    w: Math.round(w * 100) / 100,
    h: Math.round(h * 100) / 100,
    hTotal: b.crop ? Math.round(hTotal * 100) / 100 : null,
    dy: b.crop ? -Math.round(hTotal * b.crop.from * 100) / 100 : 0,
    ppp,
  };
}

function convertir(
  b: Block,
  pieza: Pieza,
  imagenes: ReadonlyMap<string, InfoImagen>,
  avisos: AvisoImagen[],
  caja: { ancho: number; alto: number },
): BloqueImpreso | null {
  switch (b.type) {
    case "heading":
      return { tipo: "titulo", nivel: b.level, runs: aRuns(b.text) };
    case "paragraph": {
      let runs = aRuns(b.text);
      let capitular: string | null = null;
      if (b.dropCap) {
        const s = sinPrimeraLetra(runs);
        capitular = s.letra || null;
        runs = s.runs;
      }
      // Sangría como en el impreso: el libro la lleva; prólogos, notas y ensayos no (medido).
      const prosa = b.align === "justify" || b.align === "start";
      return {
        tipo: "parrafo",
        runs,
        alinear: ALINEAR[b.align],
        sangria: prosa && pieza.kind === "libro" && b.indent,
        capitular,
      };
    }
    case "byline":
      return { tipo: "firma", runs: aRuns(b.text), credito: b.credit };
    case "ornament":
      return { tipo: "ornamento", texto: b.text };
    case "spacer":
      return { tipo: "espacio" };
    case "image": {
      const info = imagenes.get(b.asset);
      if (!info) return null; // sin archivo no se imprime (lo avisa quien llama)
      const m = medirImagen(b, info, caja);
      if (m.ppp < PPP_MINIMO) avisos.push({ pieza: pieza.title, imagen: b.asset, ppp: m.ppp });
      return {
        tipo: "imagen",
        ruta: `/img/${b.asset}`,
        w: m.w,
        h: m.h,
        hTotal: m.hTotal,
        dy: m.dy,
      };
    }
  }
}

/** Bloques de apertura: todo lo que va antes del primer párrafo (portadilla, título, filete, firma). */
function dividirApertura(bloques: BloqueImpreso[]): {
  apertura: BloqueImpreso[];
  cuerpo: BloqueImpreso[];
} {
  const i = bloques.findIndex((b) => b.tipo === "parrafo");
  if (i < 0) return { apertura: [], cuerpo: bloques };
  return { apertura: bloques.slice(0, i), cuerpo: bloques.slice(i) };
}

/** Orden de impresión por omisión: prólogo, notas e introducciones antes del libro; lo demás después. */
export function ordenDeImpresion<T extends Pick<Pieza, "kind" | "title">>(
  piezas: readonly T[],
): T[] {
  const antes = /pr[oó]logo|nota|introducci|presentaci|dedicatoria|prefacio|advertencia/i;
  const principal = piezas.filter((p) => p.kind !== "complemento");
  const complementos = piezas.filter((p) => p.kind === "complemento");
  return [
    ...complementos.filter((p) => antes.test(p.title)),
    ...principal,
    ...complementos.filter((p) => !antes.test(p.title)),
  ];
}

const lineas = (texto: string) =>
  texto
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .reduce<string[]>((acc, l) => (l === "" && acc[acc.length - 1] === "" ? acc : [...acc, l]), [])
    .join("\n")
    .trim()
    .split("\n");

export function armarLibro(
  piezas: readonly Pieza[],
  opciones: OpcionesLibro,
  imagenes: ReadonlyMap<string, InfoImagen>,
): { datos: DatosLibro; avisos: AvisoImagen[]; faltantes: string[] } {
  const avisos: AvisoImagen[] = [];
  const faltantes: string[] = [];
  const margenes = opciones.margenes ?? "clasico";
  const caja = cajaDe(margenes);
  const impresas = piezas.map((pieza): PiezaImpresa => {
    for (const b of pieza.blocks)
      if (b.type === "image" && !imagenes.has(b.asset))
        faltantes.push(`${pieza.title}: ${b.asset}`);
    const bloques = pieza.blocks
      .map((b) => convertir(b, pieza, imagenes, avisos, caja))
      .filter((b): b is BloqueImpreso => b !== null);
    const { apertura, cuerpo } = dividirApertura(bloques);
    const conPortadilla = pieza.blocks
      .slice(0, pieza.blocks.findIndex((b) => b.type === "paragraph") + 1 || undefined)
      .some((b) => b.type === "image" && b.role === "portadilla");
    return { tipo: pieza.kind, titulo: pieza.title, conPortadilla, apertura, cuerpo };
  });
  const legal = opciones.legal.trim() ? lineas(opciones.legal) : [];
  const colofon = opciones.colofon.trim() ? lineas(opciones.colofon) : [];
  return {
    datos: {
      titulo: opciones.titulo.trim(),
      autor: opciones.autor.trim(),
      legal,
      colofon,
      guiones: opciones.guiones,
      multiploDe4: opciones.multiploDe4,
      margenes,
      saltos: 0,
      piezas: impresas,
    },
    avisos,
    faltantes,
  };
}

/**
 * Páginas que hay que agregar al final para que el colofón quede en la última página y, si se pide,
 * el total sea múltiplo de 4 (como completa Acrobat al imprimir en folleto).
 */
export function saltosFinales(
  paginasDelTexto: number,
  multiploDe4: boolean,
  conColofon: boolean,
): number {
  if (!multiploDe4 && !conColofon) return 0;
  const total = multiploDe4 ? Math.ceil((paginasDelTexto + 1) / 4) * 4 : paginasDelTexto + 1;
  return total - paginasDelTexto;
}

/** Texto de la página legal propuesto con lo que se sabe (la editorial lo revisa y completa). */
export function legalPropuesta(d: {
  titulo: string;
  autor: string;
  creditos: ReadonlyArray<{ rol: string; nombre: string }>;
  coleccion: string | null;
  anio: number;
}): string {
  return [
    d.titulo,
    d.autor,
    "",
    ...d.creditos.map((c) => `${c.rol}: ${c.nombre}`),
    ...(d.creditos.length > 0 ? [""] : []),
    ...(d.coleccion ? [`Colección ${d.coleccion}`] : []),
    `© ${d.anio} Editorial Huapango`,
    "",
    "ISBN: ",
  ].join("\n");
}
