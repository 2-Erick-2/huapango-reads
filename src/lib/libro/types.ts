/**
 * Formato canónico de contenido de +reads (ADR 0010 y 0016).
 *
 * Es el único formato que entiende el lector. Las entradas (EPUB de InDesign, Word) se convierten a
 * esto con `scripts/ingesta/`. Es JSON puro y no depende del navegador, para que lo usen por igual
 * el importador (Node), el lector y, más adelante, el editor.
 */

/** Texto en línea. Un string es texto plano; los objetos marcan énfasis. */
export type Inline = string | { em: Inline[] } | { strong: Inline[] } | { smallCaps: Inline[] };

/** Alineación lógica ("end" = a la derecha en español), independiente del CSS de origen. */
export type Align = "start" | "center" | "end" | "justify";

/** Marca de salto de página del impreso dentro de un párrafo. `offset` es posición en el texto plano. */
export interface PageMark {
  offset: number;
  page: string;
}

interface BlockBase {
  /** Identificador posicional estable dentro de la pieza: `<slug>-<n>`. */
  id: string;
  /** Página del impreso donde empieza el bloque (null si el origen no la trae). */
  page: string | null;
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  level: 1 | 2 | 3;
  text: Inline[];
}

export interface ParagraphBlock extends BlockBase {
  type: "paragraph";
  text: Inline[];
  /** Sangría de primera línea */
  indent: boolean;
  align: Align;
  /** Capitular decidida por la editorial (se pinta con CSS, escala con la letra) */
  dropCap: boolean;
  /** Huella corta del texto: sirve para re-anclar progreso y subrayados si el texto se edita */
  hash: string;
  /** Saltos de página del impreso que caían a mitad del párrafo */
  marks: PageMark[];
}

/** Firma al final de un texto: nombre y, si existe, su línea de crédito ("Filósofo tamaulipeco"). */
export interface BylineBlock extends BlockBase {
  type: "byline";
  text: Inline[];
  credit: string | null;
  hash: string;
}

/**
 * `portadilla` es arte a página completa que acompaña la apertura de una pieza; `divisor` separa
 * capítulos; `ilustracion` es una viñeta pequeña; `ornamento` es un adorno suelto.
 */
export type ImageRole = "portadilla" | "ilustracion" | "divisor" | "ornamento";

export interface ImageBlock extends BlockBase {
  type: "image";
  /** Ruta relativa a la carpeta `assets/` de la pieza, con huella en el nombre */
  asset: string;
  /** Texto alternativo. Vacío solo si la imagen es decorativa. */
  alt: string;
  role: ImageRole;
  decorative: boolean;
  /** Ancho relativo al ancho de la columna de lectura, tomado del impreso (null = ancho natural) */
  widthPct: number | null;
  /** Medidas en px del archivo, para reservar espacio y evitar saltos de diseño */
  width: number;
  height: number;
  /**
   * Banda vertical visible de la imagen, en fracciones de su alto (0 = arriba, 1 = abajo). Sirve para
   * mostrar solo los pájaros de una tarjeta de capítulo sin el título que viene "horneado" en la imagen.
   */
  crop?: { from: number; to: number };
}

/** Línea en blanco del impreso (pausa entre escenas). Nunca al inicio ni al final. */
export interface SpacerBlock extends BlockBase {
  type: "spacer";
}

/** Marca de cierre como "FIN" o "* * *". */
export interface OrnamentBlock extends BlockBase {
  type: "ornament";
  text: string;
}

export type Block =
  HeadingBlock | ParagraphBlock | BylineBlock | ImageBlock | SpacerBlock | OrnamentBlock;

/**
 * "libro" es la obra; "complemento" es una pieza ligada a ella (prólogo, nota, epílogo…; ADR 0012);
 * "ensayo" es una obra de una sola pieza, de acceso libre (ADR 0019).
 */
export type PiezaKind = "libro" | "complemento" | "ensayo";

export interface PiezaStats {
  words: number;
  paragraphs: number;
  /** Minutos de lectura estimados, mínimo 1 */
  minutes: number;
}

export interface Pieza {
  version: 1;
  slug: string;
  kind: PiezaKind;
  /** Slug de la obra a la que pertenece un complemento; null si es el libro */
  parentSlug: string | null;
  title: string;
  /** Quién firma la pieza, tal como aparece en el impreso (null si no hay firma) */
  credit: string | null;
  language: "es-MX";
  blocks: Block[];
  stats: PiezaStats;
  /** Procedencia: de qué archivo salió y su huella, para auditar. */
  source: { file: string; sha256: string };
}

/** Entrada de `manifest.json`: lista de piezas de una obra, en orden de lectura. */
export interface ManifestEntry {
  slug: string;
  kind: PiezaKind;
  title: string;
  credit: string | null;
  file: string;
  stats: PiezaStats;
}

export interface Manifest {
  version: 1;
  obra: string;
  /** Resumen de la obra (los ensayos lo muestran en el inicio). Opcional. */
  summary?: string;
  /** Autoría de la obra, tal como se firma. Opcional. */
  authors?: string[];
  pieces: ManifestEntry[];
}
