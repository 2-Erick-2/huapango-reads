/**
 * "Importar y revisar" debe poder reproducir, con decisiones de pantalla, exactamente lo que el
 * importador produjo con los mapeos hechos a mano y verificados (public/contenido/).
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  analizar,
  ES_FIRMA,
  CIERRE,
  proponerImagen,
  revisar,
  tituloDeArchivo,
  type DecisionFuente,
  type FuenteAnalizada,
} from "./importar-epub";

const sinOrigen = (p: object) => ({ ...p, source: null });
const publicada = (obra: string, slug: string) =>
  sinOrigen(JSON.parse(readFileSync(`public/contenido/${obra}/${slug}.json`, "utf8")) as object);
const inicioDe = (f: FuenteAnalizada, texto: string) => {
  const b = f.bloques.find((x) => x.tipo === "texto" && x.texto.startsWith(texto));
  if (!b || b.tipo !== "texto") throw new Error(`No encuentro «${texto}»`);
  return b.i;
};
const hayContenido = existsSync("contenido-privado/nahual/epub/NAHUAL PROLOGO1.epub");

describe("propuestas", () => {
  it("reconoce imágenes-título, logos y divisores por su nombre y ancho", () => {
    expect(proponerImagen("image/prologo.jpg", 30, false)).toBe("titulo");
    expect(proponerImagen("image/nota_del_autor.jpg", 34, false)).toBe("titulo");
    expect(proponerImagen("image/LOGO_HUAPANGO.png", 32, false)).toBe("ignorar");
    expect(proponerImagen("image/vineta.png", 20, false)).toBe("divisor");
    expect(proponerImagen("image/arte.png", null, true)).toBe("portadilla");
    expect(proponerImagen("image/arte.png", 62, false)).toBe("ilustracion");
  });
  it("arma el texto de una imagen-título desde su nombre", () => {
    expect(tituloDeArchivo("image/prologo.jpg")).toBe("Prólogo");
    expect(tituloDeArchivo("image/nota_del_autor.jpg")).toBe("Nota del autor");
    expect(tituloDeArchivo("image/analisis_visual.jpg")).toBe("Análisis visual");
  });
  it("detecta firmas y cierres", () => {
    expect(ES_FIRMA.test("Por Mercedes Varela")).toBe(true);
    expect(ES_FIRMA.test("Por la mañana salió.")).toBe(false);
    expect(CIERRE.test("FIN")).toBe(true);
    expect(CIERRE.test("* * *")).toBe(true);
    expect(CIERRE.test("Final")).toBe(false);
  });
});

describe.runIf(hayContenido)("reproduce los libros reales", () => {
  it("El príncipe feliz: propuestas automáticas + ignorar «próximos lanzamientos» = lo publicado", () => {
    const dir = "contenido-privado/el-principe-feliz/epub";
    const archivos = [
      "EL_PRINCIPE_FELIZ_CONTENIDO.epub",
      "EL_PRINCIPE_FELIZ_PROLOGO.epub",
      "EL_PRINCIPE_FELIZ_NOTA_DE_LA_TRADUCTORA.epub",
    ];
    const slugs = [
      "el-principe-feliz",
      "el-principe-feliz-prologo",
      "el-principe-feliz-nota-de-la-traductora",
    ];
    const titulos = ["El príncipe feliz", "Prólogo", "Nota de la traductora"];
    const fuentes = archivos.map((a) => ({ nombre: a, datos: readFileSync(`${dir}/${a}`) }));
    const analisis = analizar(fuentes);
    const decisiones: DecisionFuente[] = analisis.map((f, i) => ({
      estilos: Object.fromEntries(
        f.estilos.map((e) => [
          e.clase,
          i === 0 && e.clase === "ParaOverride-6" ? "ignorar" : e.propuesto,
        ]),
      ),
      textos: Object.fromEntries(f.textos.map((t) => [t.texto, t.propuesto])),
      imagenes: Object.fromEntries(
        f.imagenes.map((im) => [im.src, { rol: im.propuesto, texto: im.texto }]),
      ),
      piezas: [
        {
          inicio: 0,
          titulo: titulos[i] ?? "",
          slug: slugs[i] ?? "",
          tipo: i === 0 ? "libro" : "complemento",
          capitular: i === 0,
        },
      ],
    }));
    const r = revisar(fuentes, {
      obra: "el-principe-feliz",
      tipoObra: "libro",
      fuentes: decisiones,
    });
    expect(r.ok).toBe(true);
    expect(r.errores).toEqual([]);
    for (const p of r.piezas) expect(sinOrigen(p)).toEqual(publicada("el-principe-feliz", p.slug));
  }, 60_000);

  it("Nahual: un EPUB dividido en 5 piezas, con imágenes fuera de lugar reubicadas = lo publicado", () => {
    const fuentes = [
      {
        nombre: "NAHUAL PROLOGO1.epub",
        datos: readFileSync("contenido-privado/nahual/epub/NAHUAL PROLOGO1.epub"),
      },
    ];
    const [f] = analizar(fuentes);
    if (!f) throw new Error("sin análisis");
    const mapeo = JSON.parse(readFileSync("contenido-privado/nahual/mapeo.json", "utf8")) as {
      fuentes: Array<{
        imagenes: Record<
          string,
          { rol: DecisionFuente["imagenes"][string]["rol"]; texto?: string }
        >;
        piezas: Array<{
          slug: string;
          tipo: "libro" | "complemento";
          titulo: string;
          desde: string;
          portadilla?: string;
          capitular?: boolean;
          colocar?: Array<{ imagen: string; antes?: string }>;
        }>;
      }>;
    };
    const m = mapeo.fuentes[0];
    if (!m) throw new Error("sin mapeo");
    const decision: DecisionFuente = {
      estilos: {},
      imagenes: Object.fromEntries(
        Object.entries(m.imagenes).map(([src, v]) => {
          const titula = m.piezas.find((p) => p.portadilla === src);
          const col = m.piezas.flatMap((p) => p.colocar ?? []).find((c) => c.imagen === src);
          const antes = titula
            ? inicioDe(f, titula.desde)
            : col?.antes
              ? inicioDe(f, col.antes)
              : undefined;
          return [src, { rol: v.rol, texto: v.texto, antes }];
        }),
      ),
      piezas: m.piezas.map((p) => ({
        inicio: inicioDe(f, p.desde),
        titulo: p.titulo,
        slug: p.slug,
        tipo: p.tipo,
        capitular: p.capitular === true,
      })),
    };
    const r = revisar(fuentes, { obra: "nahual", tipoObra: "libro", fuentes: [decision] });
    expect(r.ok).toBe(true);
    expect(r.piezas).toHaveLength(5);
    for (const p of r.piezas) expect(sinOrigen(p)).toEqual(publicada("nahual", p.slug));
  }, 60_000);

  it("propone dividir Nahual donde hay imágenes-título", () => {
    const [f] = analizar([
      {
        nombre: "n.epub",
        datos: readFileSync("contenido-privado/nahual/epub/NAHUAL PROLOGO1.epub"),
      },
    ]);
    expect(f?.piezas.map((p) => p.titulo)).toContain("Nota del autor");
  }, 60_000);

  it("explica en palabras claras un inicio que no existe", () => {
    const fuentes = [
      {
        nombre: "n.epub",
        datos: readFileSync("contenido-privado/nahual/epub/NAHUAL PROLOGO1.epub"),
      },
    ];
    expect(() =>
      revisar(fuentes, {
        obra: "nahual",
        tipoObra: "libro",
        fuentes: [
          {
            estilos: {},
            imagenes: {},
            piezas: [{ inicio: 99999, titulo: "X", slug: "x", tipo: "libro", capitular: false }],
          },
        ],
      }),
    ).toThrow("empieza en un párrafo que no existe");
  }, 60_000);
});
