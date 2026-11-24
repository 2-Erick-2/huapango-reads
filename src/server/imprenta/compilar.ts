/**
 * Compila el libro impreso con Typst en WebAssembly (ADR 0023): no depende de binarios nativos (en el
 * equipo de la editorial no arrancan, ADR 0017) ni de Python. El motor y las fuentes se cargan una
 * sola vez por proceso.
 *
 * Archivos que lee (desde la raíz del proyecto, donde corre el servidor):
 * - `node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm`
 * - `src/server/imprenta/fuentes/*.otf|ttf` (OFL, ver su LEEME.md)
 * - `public/brand/logo-huapango.svg`
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CompileFormatEnum, createTypstCompiler } from "@myriaddreamin/typst.ts/compiler";
import { disableDefaultFontAssets, loadFonts } from "@myriaddreamin/typst.ts/options.init";
import { PDFDocument } from "pdf-lib";
import { saltosFinales, type DatosLibro } from "./libro";
import plantilla from "./plantilla-libro.typ?raw";

type Compilador = ReturnType<typeof createTypstCompiler>;

const raiz = () => process.cwd();
let compilador: Promise<Compilador> | null = null;
let dropletFuentes: Array<[string, string]> | null = null;

function leerDroplet(): Array<[string, string]> {
  if (dropletFuentes) return dropletFuentes;
  const dir = join(raiz(), "src", "server", "imprenta", "droplet");
  dropletFuentes = readdirSync(dir)
    .filter((f) => f.endsWith(".typ"))
    .map((f) => [`/droplet/${f}`, readFileSync(join(dir, f), "utf8")]);
  return dropletFuentes;
}

function iniciar(): Promise<Compilador> {
  compilador ??= (async () => {
    const dirFuentes = join(raiz(), "src", "server", "imprenta", "fuentes");
    const fuentes = readdirSync(dirFuentes)
      .filter((f) => /\.(otf|ttf)$/i.test(f))
      .map((f) => new Uint8Array(readFileSync(join(dirFuentes, f))));
    const wasm = readFileSync(
      join(
        raiz(),
        "node_modules",
        "@myriaddreamin",
        "typst-ts-web-compiler",
        "pkg",
        "typst_ts_web_compiler_bg.wasm",
      ),
    );
    const c = createTypstCompiler();
    await c.init({
      getModule: () => wasm,
      beforeBuild: [disableDefaultFontAssets(), loadFonts(fuentes)],
    });
    return c;
  })();
  return compilador;
}

export interface ResultadoCompilacion {
  pdf: Uint8Array;
  paginas: number;
  /** Advertencias de la composición (p. ej. si el diseño no se estabilizó) */
  advertencias: string[];
}

/** Error de la plantilla o de los datos, con un mensaje que se puede mostrar. */
export class ErrorDeImpresion extends Error {}

let enCurso: Promise<unknown> = Promise.resolve();

/**
 * Compila el libro en dos pasadas: la primera mide cuántas páginas ocupa el texto; la segunda agrega
 * las blancas y el colofón para cerrar en múltiplo de 4. Se verifica el total.
 */
export async function compilarLibro(
  datos: DatosLibro,
  imagenes: ReadonlyMap<string, Uint8Array>,
): Promise<ResultadoCompilacion> {
  const texto = await compilarUnaVez({ ...datos, saltos: 0 }, imagenes);
  const saltos = saltosFinales(texto.paginas, datos.multiploDe4, datos.colofon.length > 0);
  if (saltos === 0) return texto;
  const final = await compilarUnaVez({ ...datos, saltos }, imagenes);
  const esperado = texto.paginas + saltos;
  if (final.paginas !== esperado)
    throw new ErrorDeImpresion(
      `El libro quedó en ${final.paginas} páginas y se esperaban ${esperado}. Avísale a Erick.`,
    );
  return final;
}

/**
 * Una compilación. Se hacen de una en una: el compilador guarda archivos en su memoria (datos e
 * imágenes) y dos a la vez se pisarían.
 */
function compilarUnaVez(
  datos: DatosLibro,
  imagenes: ReadonlyMap<string, Uint8Array>,
): Promise<ResultadoCompilacion> {
  const tarea = enCurso.then(async () => {
    const c = await iniciar();
    c.resetShadow();
    for (const [ruta, codigo] of leerDroplet()) c.addSource(ruta, codigo);
    c.addSource("/main.typ", plantilla);
    c.mapShadow("/datos.json", new TextEncoder().encode(JSON.stringify(datos)));
    c.mapShadow(
      "/logo.svg",
      new Uint8Array(readFileSync(join(raiz(), "public", "brand", "logo-huapango.svg"))),
    );
    for (const [nombre, bytes] of imagenes) c.mapShadow(`/img/${nombre}`, bytes);
    const r = (await c.compile({
      mainFilePath: "/main.typ",
      format: CompileFormatEnum.pdf,
      diagnostics: "full",
    })) as { result?: Uint8Array; diagnostics?: Array<{ severity: string; message: string }> };
    const errores = (r.diagnostics ?? []).filter((d) => d.severity === "error");
    if (!r.result || errores.length > 0)
      throw new ErrorDeImpresion(
        `No se pudo armar el PDF. ${errores.map((e) => e.message).join(" · ")}`.trim(),
      );
    const doc = await PDFDocument.load(r.result);
    const advertencias = (r.diagnostics ?? [])
      .filter((d) => d.severity === "warning")
      .map((d) => d.message);
    return { pdf: r.result, paginas: doc.getPageCount(), advertencias };
  });
  enCurso = tarea.catch(() => undefined);
  return tarea;
}
