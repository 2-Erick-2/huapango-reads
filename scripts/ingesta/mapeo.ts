/**
 * Mapeo por libro: las decisiones editoriales que no se pueden deducir del EPUB.
 *
 * InDesign renombra las clases en cada exportación y no distingue un prólogo de un cuento, así que
 * cada obra trae un `mapeo.json` revisado por una persona. Una obra puede venir en varios EPUB
 * (p. ej. el libro, su prólogo y su nota por separado): cada uno es una "fuente" con su propio
 * juego de clases, textos, imágenes y piezas. El importador valida este archivo con mucho rigor y
 * falla con un mensaje claro en vez de adivinar.
 */

export type RolClase = "titulo1" | "titulo2" | "parrafo" | "firma" | "ignorar";

/** Rol por texto exacto: además de los de clase, "ornamento" ("FIN", "* * *"). */
export type RolTexto = RolClase | "ornamento";

/**
 * - `titulo`: imagen que SOLO dice un título (portadilla de un prólogo); se reemplaza por texto real.
 * - `capitulo`: tarjeta de capítulo (adorno + el nombre del capítulo dentro de la imagen). Al colocarla
 *   se genera el adorno recortado (sin el nombre) y un título real con `texto`.
 */
export type RolImagen =
  "titulo" | "capitulo" | "portadilla" | "ilustracion" | "divisor" | "ornamento" | "ignorar";

export interface Recorte {
  /** Fracción del alto donde empieza la banda visible (0 = arriba) */
  desde: number;
  /** Fracción del alto donde termina (1 = abajo) */
  hasta: number;
}

export interface ImagenMapeo {
  rol: RolImagen;
  /** Roles "titulo" y "capitulo": el texto que dice la imagen, que pasa a ser un título real */
  texto?: string;
  /** Texto alternativo. Sin él, la imagen es decorativa. */
  alt?: string;
  /** Rol "capitulo": banda de la imagen que se conserva como adorno. Por omisión, la mitad de arriba. */
  recorte?: Recorte;
}

export interface Colocacion {
  imagen: string;
  /** Prefijo del texto del bloque ANTES del cual va la imagen */
  antes?: string;
  /** Prefijo del texto del bloque DESPUÉS del cual va la imagen */
  despues?: string;
  alInicio?: boolean;
  alFinal?: boolean;
}

export interface PiezaMapeo {
  slug: string;
  tipo: "libro" | "complemento";
  titulo: string;
  /** Prefijo del texto del primer bloque de la pieza (debe ser único en el documento) */
  desde: string;
  /** Prefijo del texto del último bloque de la pieza, incluido (se busca a partir de `desde`) */
  hasta: string;
  /** Imagen con rol "titulo" que se convierte en el encabezado de la pieza */
  portadilla?: string;
  /** Capitular en el primer párrafo (decisión de la editorial) */
  capitular?: boolean;
  colocar?: Colocacion[];
}

export interface Contraste {
  archivo: string;
  /** Slugs de las piezas que ese archivo trae. Sin esto, se compara contra todo el documento principal. */
  piezas?: string[];
}

export interface FuenteMapeo {
  /** EPUB, relativo al mapeo */
  archivo: string;
  /** Otras exportaciones cuyo texto debe coincidir con esta o con parte de ella */
  contrastes: Contraste[];
  /** Rol por nombre de clase CSS (cambia en cada exportación de InDesign) */
  clases: Record<string, RolClase>;
  /** Rol por texto exacto del párrafo. Tiene prioridad sobre `clases`. */
  textos: Record<string, RolTexto>;
  imagenes: Record<string, ImagenMapeo>;
  piezas: PiezaMapeo[];
}

export interface Mapeo {
  obra: string;
  fuentes: FuenteMapeo[];
}

const ROLES_CLASE: ReadonlySet<string> = new Set([
  "titulo1",
  "titulo2",
  "parrafo",
  "firma",
  "ignorar",
]);
const ROLES_TEXTO: ReadonlySet<string> = new Set([...ROLES_CLASE, "ornamento"]);
const ROLES_IMAGEN: ReadonlySet<string> = new Set([
  "titulo",
  "capitulo",
  "portadilla",
  "ilustracion",
  "divisor",
  "ornamento",
  "ignorar",
]);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

class MapeoError extends Error {
  constructor(path: string, message: string) {
    super(`mapeo.json › ${path}: ${message}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new MapeoError(path, "debe ser una lista");
  return value;
}

function str(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "")
    throw new MapeoError(path, "debe ser un texto no vacío");
  return value;
}

function optStr(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : str(value, path);
}

function parseRecorte(value: unknown, path: string): Recorte | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new MapeoError(path, "debe ser un objeto { desde, hasta }");
  noExtraKeys(value, ["desde", "hasta"], path);
  const { desde, hasta } = value;
  if (
    typeof desde !== "number" ||
    typeof hasta !== "number" ||
    !(desde >= 0 && hasta <= 1 && desde < hasta)
  )
    throw new MapeoError(path, "debe cumplir 0 <= desde < hasta <= 1");
  return { desde, hasta };
}

function optBool(value: unknown, path: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new MapeoError(path, "debe ser true o false");
  return value;
}

function noExtraKeys(obj: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key))
      throw new MapeoError(
        `${path}.${key}`,
        `campo desconocido (permitidos: ${allowed.join(", ")})`,
      );
  }
}

export function parseMapeo(input: unknown): Mapeo {
  if (!isRecord(input)) throw new MapeoError("(raíz)", "debe ser un objeto");
  noExtraKeys(input, ["obra", "fuentes", "nota"], "(raíz)");
  const obra = str(input["obra"], "obra");
  if (!SLUG.test(obra))
    throw new MapeoError("obra", "debe ser un slug (minúsculas, números y guiones)");

  const slugs = new Set<string>();
  const fuentes = asArray(input["fuentes"], "fuentes").map((f, i) =>
    parseFuente(f, `fuentes[${i}]`, slugs),
  );
  if (fuentes.length === 0) throw new MapeoError("fuentes", "debe haber al menos una fuente");

  const libros = fuentes.flatMap((f) => f.piezas).filter((p) => p.tipo === "libro");
  if (libros.length !== 1)
    throw new MapeoError(
      "fuentes",
      `debe haber exactamente una pieza de tipo "libro" en toda la obra (hay ${libros.length})`,
    );
  return { obra, fuentes };
}

function parseFuente(input: unknown, at: string, slugs: Set<string>): FuenteMapeo {
  if (!isRecord(input)) throw new MapeoError(at, "debe ser un objeto");
  noExtraKeys(input, ["archivo", "contrastes", "clases", "textos", "imagenes", "piezas"], at);
  const archivo = str(input["archivo"], `${at}.archivo`);

  const contrastes: Contraste[] = asArray(input["contrastes"] ?? [], `${at}.contrastes`).map(
    (c, i) => {
      const cat = `${at}.contrastes[${i}]`;
      if (!isRecord(c)) throw new MapeoError(cat, "debe ser un objeto");
      noExtraKeys(c, ["archivo", "piezas"], cat);
      const piezas =
        c["piezas"] === undefined
          ? undefined
          : asArray(c["piezas"], `${cat}.piezas`).map((s, j) => str(s, `${cat}.piezas[${j}]`));
      return { archivo: str(c["archivo"], `${cat}.archivo`), ...(piezas ? { piezas } : {}) };
    },
  );

  const clases: Record<string, RolClase> = {};
  for (const [name, rol] of Object.entries(isRecord(input["clases"]) ? input["clases"] : {})) {
    if (typeof rol !== "string" || !ROLES_CLASE.has(rol))
      throw new MapeoError(
        `${at}.clases.${name}`,
        `rol inválido (permitidos: ${[...ROLES_CLASE].join(", ")})`,
      );
    clases[name] = rol as RolClase;
  }

  const textos: Record<string, RolTexto> = {};
  for (const [text, rol] of Object.entries(isRecord(input["textos"]) ? input["textos"] : {})) {
    if (typeof rol !== "string" || !ROLES_TEXTO.has(rol))
      throw new MapeoError(
        `${at}.textos["${text}"]`,
        `rol inválido (permitidos: ${[...ROLES_TEXTO].join(", ")})`,
      );
    textos[text] = rol as RolTexto;
  }

  const imagenes: Record<string, ImagenMapeo> = {};
  for (const [path, value] of Object.entries(
    isRecord(input["imagenes"]) ? input["imagenes"] : {},
  )) {
    const iat = `${at}.imagenes["${path}"]`;
    if (!isRecord(value)) throw new MapeoError(iat, "debe ser un objeto");
    noExtraKeys(value, ["rol", "texto", "alt", "recorte"], iat);
    const rol = value["rol"];
    if (typeof rol !== "string" || !ROLES_IMAGEN.has(rol))
      throw new MapeoError(
        `${iat}.rol`,
        `rol inválido (permitidos: ${[...ROLES_IMAGEN].join(", ")})`,
      );
    const texto = optStr(value["texto"], `${iat}.texto`);
    const alt = optStr(value["alt"], `${iat}.alt`);
    if ((rol === "titulo" || rol === "capitulo") && texto === undefined)
      throw new MapeoError(iat, `el rol "${rol}" necesita "texto"`);
    const recorte = parseRecorte(value["recorte"], `${iat}.recorte`);
    if (recorte !== undefined && rol !== "capitulo")
      throw new MapeoError(`${iat}.recorte`, 'solo se usa con el rol "capitulo"');
    imagenes[path] = {
      rol: rol as RolImagen,
      ...(texto !== undefined ? { texto } : {}),
      ...(alt !== undefined ? { alt } : {}),
      ...(recorte !== undefined ? { recorte } : {}),
    };
  }

  const piezas = asArray(input["piezas"], `${at}.piezas`).map((p, i) =>
    parsePieza(p, `${at}.piezas[${i}]`, slugs),
  );
  if (piezas.length === 0) throw new MapeoError(`${at}.piezas`, "debe haber al menos una pieza");

  for (const p of piezas) {
    if (p.portadilla !== undefined && imagenes[p.portadilla]?.rol !== "titulo")
      throw new MapeoError(
        `${at}.piezas[${p.slug}].portadilla`,
        `"${p.portadilla}" debe estar en "imagenes" con rol "titulo"`,
      );
    for (const c of p.colocar ?? []) {
      const rol = imagenes[c.imagen]?.rol;
      if (rol === undefined)
        throw new MapeoError(
          `${at}.piezas[${p.slug}].colocar`,
          `"${c.imagen}" no está en "imagenes"`,
        );
      if (rol === "titulo" || rol === "ignorar")
        throw new MapeoError(
          `${at}.piezas[${p.slug}].colocar`,
          `"${c.imagen}" tiene rol "${rol}" y no se coloca`,
        );
    }
  }
  const propios = new Set(piezas.map((p) => p.slug));
  for (const [i, c] of contrastes.entries()) {
    for (const slug of c.piezas ?? []) {
      if (!propios.has(slug))
        throw new MapeoError(
          `${at}.contrastes[${i}].piezas`,
          `la fuente no tiene la pieza "${slug}"`,
        );
    }
  }
  return { archivo, contrastes, clases, textos, imagenes, piezas };
}

function parsePieza(p: unknown, at: string, slugs: Set<string>): PiezaMapeo {
  if (!isRecord(p)) throw new MapeoError(at, "debe ser un objeto");
  noExtraKeys(
    p,
    ["slug", "tipo", "titulo", "desde", "hasta", "portadilla", "capitular", "colocar"],
    at,
  );
  const slug = str(p["slug"], `${at}.slug`);
  if (!SLUG.test(slug)) throw new MapeoError(`${at}.slug`, "debe ser un slug");
  if (slugs.has(slug)) throw new MapeoError(`${at}.slug`, `slug repetido en la obra: ${slug}`);
  slugs.add(slug);
  const tipo = p["tipo"];
  if (tipo !== "libro" && tipo !== "complemento")
    throw new MapeoError(`${at}.tipo`, 'debe ser "libro" o "complemento"');

  const colocar: Colocacion[] = asArray(p["colocar"] ?? [], `${at}.colocar`).map((c, j) => {
    const cat = `${at}.colocar[${j}]`;
    if (!isRecord(c)) throw new MapeoError(cat, "debe ser un objeto");
    noExtraKeys(c, ["imagen", "antes", "despues", "alInicio", "alFinal"], cat);
    const antes = optStr(c["antes"], `${cat}.antes`);
    const despues = optStr(c["despues"], `${cat}.despues`);
    const alInicio = optBool(c["alInicio"], `${cat}.alInicio`);
    const alFinal = optBool(c["alFinal"], `${cat}.alFinal`);
    const places = [antes, despues, alInicio, alFinal].filter(
      (v) => v !== undefined && v !== false,
    ).length;
    if (places !== 1)
      throw new MapeoError(
        cat,
        'indica exactamente una posición: "antes", "despues", "alInicio" o "alFinal"',
      );
    return {
      imagen: str(c["imagen"], `${cat}.imagen`),
      ...(antes !== undefined ? { antes } : {}),
      ...(despues !== undefined ? { despues } : {}),
      ...(alInicio ? { alInicio } : {}),
      ...(alFinal ? { alFinal } : {}),
    };
  });
  const portadilla = optStr(p["portadilla"], `${at}.portadilla`);
  const capitular = optBool(p["capitular"], `${at}.capitular`);
  return {
    slug,
    tipo,
    titulo: str(p["titulo"], `${at}.titulo`),
    desde: str(p["desde"], `${at}.desde`),
    hasta: str(p["hasta"], `${at}.hasta`),
    ...(portadilla !== undefined ? { portadilla } : {}),
    ...(capitular !== undefined ? { capitular } : {}),
    colocar,
  };
}
