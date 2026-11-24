import { describe, expect, it } from "vitest";
import { blockText } from "../../src/lib/libro/text.ts";
import type { ImgAtom, ParaAtom, Warning } from "./atoms.ts";
import type { FuenteMapeo } from "./mapeo.ts";
import { normalizar, type Draft } from "./normalizar.ts";
import { construirPieza, dividir, type ImagenPreparada } from "./piezas.ts";

function p(text: string, over: Partial<ParaAtom> = {}): ParaAtom {
  return {
    kind: "p",
    doc: "d.xhtml",
    tag: "p",
    classes: [],
    id: null,
    inlines: text === "" ? [] : [text],
    text,
    marks: [],
    page: null,
    align: "justify",
    indent: true,
    fontSizeEm: 1,
    headingLevel: null,
    ...over,
  };
}

function img(src: string, widthPct: number | null = null): ImgAtom {
  return { kind: "img", doc: "d.xhtml", src, alt: "", widthPct, page: null };
}

function fuente(over: Partial<FuenteMapeo> = {}): FuenteMapeo {
  return {
    archivo: "x.epub",
    contrastes: [],
    clases: {},
    textos: {},
    imagenes: {},
    piezas: [],
    ...over,
  };
}

const textos = (drafts: Draft[]) =>
  drafts.map((d) =>
    d.type === "spacer"
      ? "·"
      : d.type === "byline"
        ? `byline:${d.text}${d.credit ? `/${d.credit}` : ""}`
        : `${d.type}:${d.text}`,
  );

describe("normalizar: roles", () => {
  it("el texto exacto manda sobre la clase, y la clase sobre las heurísticas", () => {
    const f = fuente({
      clases: { T: "titulo1", Z: "ignorar" },
      textos: { FIN: "ornamento", "Por Ana": "firma" },
    });
    const warnings: Warning[] = [];
    const s = normalizar(
      [
        p("Título", { classes: ["T"] }),
        p("FIN", { classes: ["T"] }),
        p("Por Ana", { classes: ["T"], align: "center" }),
        p("Colofón", { classes: ["Z"] }),
        p("Cuerpo."),
      ],
      f,
      warnings,
    );
    expect(textos(s.drafts)).toEqual([
      "heading:Título",
      "ornament:FIN",
      "byline:Por Ana",
      "paragraph:Cuerpo.",
    ]);
    expect(s.ignored.map((a) => a.text)).toEqual(["Colofón"]);
    expect(s.paragraphs).toHaveLength(5);
  });

  it("alineado a la derecha y corto es una firma; largo es un párrafo", () => {
    const largo = "palabra ".repeat(20).trim();
    const s = normalizar(
      [p("Ángelus", { align: "end" }), p(largo, { align: "end" })],
      fuente(),
      [],
    );
    expect(textos(s.drafts)).toEqual(["byline:Ángelus", `paragraph:${largo}`]);
  });

  it("une dos líneas de firma seguidas en una sola (nombre y crédito)", () => {
    const s = normalizar(
      [p("Argenis González", { align: "end" }), p("Filósofo tamaulipeco", { align: "end" })],
      fuente(),
      [],
    );
    expect(textos(s.drafts)).toEqual(["byline:Argenis González/Filósofo tamaulipeco"]);
  });

  it("avisa si hay más de dos líneas de firma", () => {
    const warnings: Warning[] = [];
    normalizar(
      [p("A", { align: "end" }), p("B", { align: "end" }), p("C", { align: "end" })],
      fuente(),
      warnings,
    );
    expect(warnings.map((w) => w.code)).toContain("firma-larga");
  });

  it("un párrafo vacío es un espacio, y se registran las imágenes aparte", () => {
    const s = normalizar([p("Uno."), p(""), img("a.png"), p("Dos.")], fuente(), []);
    expect(textos(s.drafts)).toEqual(["paragraph:Uno.", "·", "paragraph:Dos."]);
    expect(s.images.map((i) => i.src)).toEqual(["a.png"]);
  });
});

describe("dividir", () => {
  const drafts = () =>
    normalizar(
      [
        p("Prólogo uno."),
        p("Ángelus", { align: "end" }),
        p(""),
        p("Cuento uno."),
        p("Cuento dos."),
        p("Fin del cuento."),
      ],
      fuente(),
      [],
    ).drafts;

  const def = (slug: string, desde: string, hasta: string) => ({
    slug,
    tipo: slug === "cuento" ? ("libro" as const) : ("complemento" as const),
    titulo: slug,
    desde,
    hasta,
  });

  it("corta por anclas de texto y es exhaustivo", () => {
    const cortes = dividir(
      drafts(),
      fuente({
        piezas: [
          def("prologo", "Prólogo uno", "Ángelus"),
          def("cuento", "Cuento uno", "Fin del cuento"),
        ],
      }),
    );
    expect(cortes.map((c) => c.drafts.length)).toEqual([2, 3]);
  });

  it("falla si un ancla de inicio no existe o es ambigua", () => {
    expect(() => dividir(drafts(), fuente({ piezas: [def("x", "No existe", "Ángelus")] }))).toThrow(
      /no hay ningún bloque/,
    );
    const dup = normalizar([p("Igual uno."), p("Igual dos.")], fuente(), []).drafts;
    expect(() => dividir(dup, fuente({ piezas: [def("x", "Igual", "Igual dos.")] }))).toThrow(
      /ambiguo/,
    );
  });

  it("falla si queda texto sin pieza, para no perderlo en silencio", () => {
    expect(() =>
      dividir(drafts(), fuente({ piezas: [def("cuento", "Cuento uno", "Fin del cuento")] })),
    ).toThrow(/sin pieza/);
    expect(() =>
      dividir(drafts(), fuente({ piezas: [def("prologo", "Prólogo uno", "Ángelus")] })),
    ).toThrow(/sin pieza/);
  });

  it("falla si el final no se encuentra o las piezas están desordenadas", () => {
    expect(() =>
      dividir(drafts(), fuente({ piezas: [def("prologo", "Prólogo uno", "Nunca aparece")] })),
    ).toThrow(/final/);
    expect(() =>
      dividir(
        drafts(),
        fuente({
          piezas: [
            def("prologo", "Prólogo uno", "Ángelus"),
            def("otra", "Prólogo uno", "Prólogo uno"),
          ],
        }),
      ),
    ).toThrow(/antes de donde terminó/);
  });
});

describe("construirPieza", () => {
  const origen = { file: "x.epub", sha256: "abc" };
  const preparadas = new Map<string, ImagenPreparada>([
    ["t.png", { assetName: "11111111-t.png", width: 825, height: 1275 }],
    ["d1.png", { assetName: "22222222-d1.png", width: 600, height: 40 }],
    ["d2.png", { assetName: "33333333-d2.png", width: 100, height: 100 }],
    ["card.png", { assetName: "44444444-card.png", width: 512, height: 853 }],
  ]);
  const imagenes = new Map<string, ImgAtom>([
    ["t.png", img("t.png")],
    ["d1.png", img("d1.png", 62)],
    ["d2.png", img("d2.png", 20)],
    ["card.png", img("card.png", 62)],
  ]);

  const build = (
    extra: Partial<FuenteMapeo["piezas"][number]>,
    atoms: ParaAtom[] = [p("Primera frase."), p("Segunda frase."), p("Firma", { align: "end" })],
  ) => {
    const f = fuente({
      imagenes: {
        "t.png": { rol: "portadilla" },
        "d1.png": { rol: "divisor" },
        "d2.png": { rol: "ilustracion", alt: "Un pájaro" },
        "card.png": { rol: "capitulo", texto: "Jornalero" },
      },
      piezas: [
        { slug: "obra", tipo: "libro", titulo: "Obra", desde: "Primera", hasta: "Firma", ...extra },
      ],
    });
    const stream = normalizar(atoms, f, []);
    const corte = dividir(stream.drafts, f)[0];
    if (!corte) throw new Error("sin corte");
    return construirPieza(corte.def, corte.drafts, f, imagenes, preparadas, origen, null);
  };

  it("arma ids posicionales, firma, huellas y estadísticas", () => {
    const { pieza } = build({});
    expect(pieza.blocks.map((b) => b.id)).toEqual(["obra-1", "obra-2", "obra-3"]);
    expect(pieza.credit).toBe("Firma");
    expect(pieza.kind).toBe("libro");
    expect(pieza.stats).toEqual({ words: 5, paragraphs: 2, minutes: 1 });
    expect(pieza.source).toEqual(origen);
  });

  it("la portadilla en imagen se convierte en un título de texto real", () => {
    const f = fuente({
      imagenes: { "titulo.jpg": { rol: "titulo", texto: "Prólogo" } },
      piezas: [
        {
          slug: "pro",
          tipo: "complemento",
          titulo: "Prólogo",
          desde: "Hola",
          hasta: "Hola",
          portadilla: "titulo.jpg",
        },
      ],
    });
    const stream = normalizar([p("Hola.")], f, []);
    const corte = dividir(stream.drafts, f)[0];
    if (!corte) throw new Error("sin corte");
    const { pieza, injected } = construirPieza(
      corte.def,
      corte.drafts,
      f,
      new Map(),
      new Map(),
      origen,
      "libro",
    );
    expect(pieza.blocks[0]).toMatchObject({ type: "heading", level: 1, text: ["Prólogo"] });
    expect([...injected]).toEqual(["pro-1"]);
    expect(pieza.parentSlug).toBe("libro");
  });

  it("coloca imágenes antes/después de un ancla conservando el orden declarado", () => {
    const { pieza } = build({
      colocar: [
        { imagen: "d1.png", antes: "Segunda" },
        { imagen: "d2.png", antes: "Segunda" },
        { imagen: "t.png", alInicio: true },
      ],
    });
    expect(pieza.blocks.map((b) => (b.type === "image" ? `img:${b.role}` : b.type))).toEqual([
      "img:portadilla",
      "paragraph",
      "img:divisor",
      "img:ilustracion",
      "paragraph",
      "byline",
    ]);
  });

  it("varias imágenes 'después' de la misma ancla también conservan su orden", () => {
    const { pieza } = build({
      colocar: [
        { imagen: "d1.png", despues: "Primera" },
        { imagen: "d2.png", despues: "Primera" },
      ],
    });
    expect(pieza.blocks.slice(1, 3).map((b) => (b.type === "image" ? b.role : b.type))).toEqual([
      "divisor",
      "ilustracion",
    ]);
  });

  it("guarda ancho relativo, medidas y marca decorativa según haya alt", () => {
    const { pieza } = build({
      colocar: [
        { imagen: "d1.png", antes: "Segunda" },
        { imagen: "d2.png", antes: "Segunda" },
      ],
    });
    const [d1, d2] = pieza.blocks.filter((b) => b.type === "image");
    expect(d1).toMatchObject({ widthPct: 62, width: 600, height: 40, decorative: true, alt: "" });
    expect(d2).toMatchObject({ widthPct: 20, decorative: false, alt: "Un pájaro" });
  });

  it("una tarjeta de capítulo se convierte en adorno recortado + título real", () => {
    const { pieza, injected } = build({ colocar: [{ imagen: "card.png", antes: "Segunda" }] });
    expect(pieza.blocks.map((b) => b.type)).toEqual([
      "paragraph",
      "image",
      "heading",
      "paragraph",
      "byline",
    ]);
    expect(pieza.blocks[1]).toMatchObject({
      role: "ornamento",
      decorative: true,
      alt: "",
      widthPct: 62,
      crop: { from: 0.04, to: 0.44 },
    });
    expect(pieza.blocks[2]).toMatchObject({ type: "heading", level: 2, text: ["Jornalero"] });
    // Lo que sale de la imagen no es texto del origen: no cuenta para la verificación de integridad.
    expect([...injected]).toEqual(["obra-2", "obra-3"]);
  });
  it("falla si el ancla de una imagen es ambigua o no existe", () => {
    expect(() => build({ colocar: [{ imagen: "d1.png", antes: "Nada" }] })).toThrow(/ancla/);
    expect(() =>
      build({ colocar: [{ imagen: "d1.png", antes: "" + "Primera" }] }, [
        p("Primera a."),
        p("Primera b."),
        p("Firma", { align: "end" }),
      ]),
    ).toThrow(/ambiguo|ancla/);
  });

  it("capitular: marca el primer párrafo solo si empieza con letra", () => {
    const { pieza } = build({ capitular: true });
    const paras = pieza.blocks.filter((b) => b.type === "paragraph");
    expect(paras.map((b) => b.dropCap)).toEqual([true, false]);
    const { pieza: dialogo } = build({ capitular: true, desde: "—Hola" }, [
      p("—Hola.", { text: "—Hola." }),
      p("Firma", { align: "end" }),
    ]);
    expect(dialogo.blocks.filter((b) => b.type === "paragraph").every((b) => !b.dropCap)).toBe(
      true,
    );
  });

  it("no deja espacios al inicio ni al final y colapsa los dobles", () => {
    const { pieza } = build({}, [
      p("Primera frase."),
      p(""),
      p(""),
      p("Segunda frase."),
      p("Firma", { align: "end" }),
    ]);
    expect(pieza.blocks.map((b) => b.type)).toEqual(["paragraph", "spacer", "paragraph", "byline"]);
    expect(blockText(pieza.blocks[0] ?? { id: "", page: null, type: "spacer" })).toBe(
      "Primera frase.",
    );
  });
});
