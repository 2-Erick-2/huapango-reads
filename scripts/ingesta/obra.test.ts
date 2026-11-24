import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { blockText } from "../../src/lib/libro/text.ts";
import type { Pieza } from "../../src/lib/libro/types.ts";
import { escribirObra, importarObra, informeMarkdown, manifestDe, type Resultado } from "./obra.ts";
import { PNG_1X1, buildEpub } from "./testing/epub-builder.ts";

const BODY = `
<div id="page1" role="doc-pagebreak" aria-label="1" epub:type="pagebreak"/>
<p class="T">Mi cuento</p>
<p class="P0">Había una vez un lector muy <span id="p2" role="doc-pagebreak" aria-label="2" epub:type="pagebreak"/>paciente.</p>
<p class="P1">Y siguió leyendo.</p>
<p class="V"> </p>
<p class="P1">Hasta que terminó.</p>
<p class="F">Autora Ejemplo</p>
<div class="L"><div id="cont"><img src="image/adorno.png" alt=""/></div></div>
<p class="Z">Texto de colofón que se ignora a propósito.</p>`;

const CSS = `
.T { text-align: center; }
.P0 { text-indent: 0; text-align: justify; }
.P1 { text-indent: 1.1em; text-align: justify; }
.F { text-align: right; }
#cont { width: 50%; }`;

const mapeoBase = (over: Record<string, unknown> = {}) => ({
  obra: "cuento",
  fuentes: [
    {
      archivo: "uno.epub",
      clases: { T: "titulo1", Z: "ignorar" },
      textos: {},
      imagenes: { "image/adorno.png": { rol: "divisor" } },
      piezas: [
        {
          slug: "cuento",
          tipo: "libro",
          titulo: "Mi cuento",
          desde: "Mi cuento",
          hasta: "Autora Ejemplo",
          colocar: [{ imagen: "image/adorno.png", antes: "Había una vez" }],
        },
      ],
      ...over,
    },
  ],
});

let dir = "";
const write = (name: string, content: Buffer | string) => {
  const path = join(dir, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "ingesta-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("importarObra (EPUB sintético)", () => {
  it("importa de punta a punta sin perder una palabra", () => {
    write("uno.epub", buildEpub({ body: BODY, css: CSS, images: { "image/adorno.png": PNG_1X1 } }));
    const mapeoPath = write("mapeo.json", JSON.stringify(mapeoBase()));
    const res = importarObra(mapeoPath);

    expect(res.ok).toBe(true);
    expect(res.checks.every((c) => c.ok)).toBe(true);
    expect(res.issues).toEqual([]);

    const pieza = res.piezas[0] as Pieza;
    expect(pieza.blocks.map((b) => b.type)).toEqual([
      "heading",
      "image",
      "paragraph",
      "paragraph",
      "spacer",
      "paragraph",
      "byline",
    ]);
    // El texto que sigue a la marca de página a mitad de frase está completo:
    const primero = pieza.blocks[2];
    expect(primero && blockText(primero)).toBe("Había una vez un lector muy paciente.");
    expect(primero).toMatchObject({
      type: "paragraph",
      indent: false,
      marks: [{ offset: 28, page: "2" }],
      page: "1",
    });
    expect(primero && blockText(primero).slice(28)).toBe("paciente.");
    expect(pieza.credit).toBe("Autora Ejemplo");
    expect(pieza.stats).toEqual({ words: 17, paragraphs: 3, minutes: 1 });
    expect(pieza.blocks[1]).toMatchObject({
      type: "image",
      role: "divisor",
      widthPct: 50,
      width: 1,
      height: 1,
      decorative: true,
    });
    expect(res.ignorados.map((p) => p.text)).toEqual([
      "Texto de colofón que se ignora a propósito.",
    ]);
    expect([...res.assets.keys()]).toHaveLength(1);
  });

  it("es determinista: dos importaciones dan exactamente el mismo resultado", () => {
    const mapeoPath = join(dir, "mapeo.json");
    const a = importarObra(mapeoPath);
    const b = importarObra(mapeoPath);
    expect(JSON.stringify(a.piezas)).toBe(JSON.stringify(b.piezas));
    expect(informeMarkdown(a)).toBe(informeMarkdown(b));
  });

  it("escribe piezas, manifiesto, assets e informe", () => {
    const mapeoPath = join(dir, "mapeo.json");
    const res = importarObra(mapeoPath);
    const out = escribirObra(res, mapeoPath);
    expect(readdirSync(out).sort()).toEqual([
      "assets",
      "cuento.json",
      "informe.md",
      "manifest.json",
    ]);
    expect(readdirSync(join(out, "assets"))).toHaveLength(1);
    expect(JSON.parse(readFileSync(join(out, "cuento.json"), "utf8"))).toEqual(
      JSON.parse(JSON.stringify(res.piezas[0])),
    );
    expect(JSON.parse(readFileSync(join(out, "manifest.json"), "utf8"))).toEqual(manifestDe(res));
    expect(readFileSync(join(out, "informe.md"), "utf8")).toContain("✅ sin errores");
  });

  it("falla con un mensaje claro si una imagen no tiene rol", () => {
    const mapeoPath = write(
      "m-sin-rol.json",
      JSON.stringify(
        mapeoBase({
          imagenes: {},
          piezas: [
            {
              slug: "cuento",
              tipo: "libro",
              titulo: "x",
              desde: "Mi cuento",
              hasta: "Autora Ejemplo",
            },
          ],
        }),
      ),
    );
    expect(() => importarObra(mapeoPath)).toThrow(/sin rol en el mapeo[\s\S]*image\/adorno\.png/);
  });

  it("falla si el mapeo deja texto sin pieza", () => {
    const mapeoPath = write(
      "m-hueco.json",
      JSON.stringify(
        mapeoBase({
          piezas: [
            {
              slug: "cuento",
              tipo: "libro",
              titulo: "x",
              desde: "Y siguió",
              hasta: "Autora Ejemplo",
            },
          ],
          imagenes: { "image/adorno.png": { rol: "ignorar" } },
        }),
      ),
    );
    expect(() => importarObra(mapeoPath)).toThrow(/sin pieza/);
  });

  it("marca como error una imagen del libro que no se colocó en ninguna pieza", () => {
    const mapeoPath = write(
      "m-sin-colocar.json",
      JSON.stringify(
        mapeoBase({
          piezas: [
            {
              slug: "cuento",
              tipo: "libro",
              titulo: "Mi cuento",
              desde: "Mi cuento",
              hasta: "Autora Ejemplo",
            },
          ],
        }),
      ),
    );
    const res = importarObra(mapeoPath);
    expect(res.ok).toBe(false);
    expect(res.checks.find((c) => c.nombre.includes("imagen del libro"))?.ok).toBe(false);
  });

  it("un párrafo cortado a media frase en el origen se marca como error", () => {
    write(
      "cortado.epub",
      buildEpub({
        body: `<p class="T">Mi cuento</p><p class="P0">La golondrina se sintió</p><p class="F">Autora Ejemplo</p>`,
        css: CSS,
      }),
    );
    const mapeoPath = write(
      "m-cortado.json",
      JSON.stringify(
        mapeoBase({
          archivo: "cortado.epub",
          imagenes: {},
          piezas: [
            {
              slug: "cuento",
              tipo: "libro",
              titulo: "Mi cuento",
              desde: "Mi cuento",
              hasta: "Autora Ejemplo",
            },
          ],
        }),
      ),
    );
    const res = importarObra(mapeoPath);
    expect(res.ok).toBe(false);
    expect(res.checks.find((c) => c.nombre.includes("cortado a media frase"))?.ok).toBe(false);
  });

  it("contrasta otra exportación y la reporta como advertencia si el texto difiere", () => {
    write(
      "otra.epub",
      buildEpub({
        body: BODY.replace("paciente.", "impaciente."),
        css: CSS,
        images: { "image/adorno.png": PNG_1X1 },
      }),
    );
    const mapeoPath = write(
      "m-contraste.json",
      JSON.stringify(
        mapeoBase({ contrastes: [{ archivo: "otra.epub" }, { archivo: "uno.epub" }] }),
      ),
    );
    const res = importarObra(mapeoPath);
    expect(res.ok).toBe(true);
    const [diferente, igual] = res.checks.filter((c) => c.nombre.startsWith("Contraste"));
    expect(diferente).toMatchObject({ ok: false, nivel: "advertencia" });
    expect(diferente?.detalle).toContain("paciente");
    expect(igual?.ok).toBe(true);
  });
});

// --- Contenido real de la editorial: protege contra regresiones (p. ej. el texto cortado) ---
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const nahual = join(raiz, "contenido-privado/nahual/mapeo.json");
const principe = join(raiz, "contenido-privado/el-principe-feliz/mapeo.json");

describe.skipIf(!existsSync(principe))("El príncipe feliz (contenido real)", () => {
  let res!: Resultado;
  let libro!: Pieza;
  beforeAll(() => {
    res = importarObra(principe);
    libro = res.piezas.find((p) => p.slug === "el-principe-feliz") as Pieza;
  });

  it("pasa toda la verificación de integridad", () => {
    expect(res.checks.filter((c) => !c.ok).map((c) => c.nombre)).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it("el cuento está completo: 3,259 palabras (el normalizador viejo daba 2,836)", () => {
    expect(libro.stats.words).toBe(3259);
    expect(res.piezas.map((p) => p.slug)).toEqual([
      "el-principe-feliz",
      "el-principe-feliz-prologo",
      "el-principe-feliz-nota-de-la-traductora",
    ]);
  });

  it("recupera los 14 párrafos que el normalizador viejo cortaba a media frase", () => {
    const textos = libro.blocks.map(blockText);
    expect(textos).toContain(
      "—¡Qué cosa más rara! —Dijo el supervisor de la fundición—. Este corazón de plomo no quiere fundirse en el horno. Tendremos que tirarlo.",
    );
    expect(
      textos.some((t) =>
        t.includes(
          "Una vez que se fueron, la golondrina se sintió muy solitaria, y empezó a cansarse de su amado.",
        ),
      ),
    ).toBe(true);
    expect(res.issues.filter((i) => i.issue.code === "posible-corte")).toEqual([]);
  });

  it("empieza con el título y la capitular, y termina en FIN", () => {
    expect(libro.blocks[0]).toMatchObject({ type: "heading" });
    expect(blockText(libro.blocks[0] as Pieza["blocks"][number])).toBe("El príncipe feliz");
    expect(libro.blocks[1]).toMatchObject({ type: "paragraph", dropCap: true, indent: false });
    expect(libro.blocks.at(-1)).toMatchObject({ type: "ornament", text: "FIN" });
  });

  it("el prólogo y la nota llevan firma y quedan ligados al libro", () => {
    const prologo = res.piezas.find((p) => p.slug === "el-principe-feliz-prologo") as Pieza;
    const nota = res.piezas.find(
      (p) => p.slug === "el-principe-feliz-nota-de-la-traductora",
    ) as Pieza;
    expect(prologo).toMatchObject({
      kind: "complemento",
      parentSlug: "el-principe-feliz",
      credit: "Mercedes Varela",
    });
    expect(nota).toMatchObject({
      kind: "complemento",
      parentSlug: "el-principe-feliz",
      credit: "Yarely Campos Servín",
    });
    expect(prologo.blocks.at(-1)).toMatchObject({ type: "byline", credit: "Julio 2026" });
  });

  it("deja fuera 'Próximos lanzamientos' y el colofón de imprenta, y lo informa", () => {
    expect(res.ignorados.some((p) => p.text.startsWith("Próximos lanzamientos"))).toBe(true);
    expect(libro.blocks.map(blockText).join(" ")).not.toContain("Impreso en");
  });
});

describe.skipIf(!existsSync(nahual))("Nahual (contenido real)", () => {
  let res!: Resultado;
  let piezas: Record<string, Pieza> = {};
  beforeAll(() => {
    res = importarObra(nahual);
    piezas = Object.fromEntries(res.piezas.map((p) => [p.slug, p]));
  });

  it("pasa toda la verificación de integridad, incluido el contraste con las otras 3 exportaciones", () => {
    expect(res.checks.filter((c) => !c.ok).map((c) => `${c.nombre}: ${c.detalle}`)).toEqual([]);
    expect(res.checks.filter((c) => c.nombre.startsWith("Contraste"))).toHaveLength(3);
    expect(res.ok).toBe(true);
  });

  it("parte el libro completo en 5 piezas: el libro y 4 complementos", () => {
    expect(res.piezas.map((p) => [p.slug, p.kind])).toEqual([
      ["nahual-prologo", "complemento"],
      ["nahual-nota-del-autor", "complemento"],
      ["nahual", "libro"],
      ["nahual-epilogo", "complemento"],
      ["nahual-analisis-visual", "complemento"],
    ]);
    expect(
      res.piezas.filter((p) => p.kind === "complemento").every((p) => p.parentSlug === "nahual"),
    ).toBe(true);
  });

  it("cada complemento abre con su título real y cierra con su firma", () => {
    expect(piezas["nahual-prologo"]?.blocks[0]).toMatchObject({
      type: "heading",
      text: ["Prólogo"],
    });
    expect(piezas["nahual-prologo"]?.credit).toBe("Ángelus");
    expect(piezas["nahual-nota-del-autor"]?.credit).toBe("Luis Armando Rosado Lara");
    expect(piezas["nahual-epilogo"]?.blocks.at(-1)).toMatchObject({
      type: "byline",
      credit: "Filósofo tamaulipeco",
    });
    expect(piezas["nahual-analisis-visual"]?.blocks.at(-1)).toMatchObject({
      type: "byline",
      credit: "Cineasta tamaulipeco",
    });
  });

  it("el cuento tiene 5 capítulos con título real: adorno, nombre del capítulo e ilustración", () => {
    const libro = piezas["nahual"] as Pieza;
    const titulos = libro.blocks.flatMap((b) =>
      b.type === "heading" ? [{ level: b.level, text: blockText(b) }] : [],
    );
    expect(titulos).toEqual(
      ["Jornalero", "Media Vida", "Alambrado", "Rezandera", "Zopilotes"].map((text) => ({
        level: 2,
        text,
      })),
    );
    const roles = libro.blocks.flatMap((b) => (b.type === "image" ? [b.role] : []));
    expect(roles).toEqual(Array.from({ length: 5 }, () => ["ornamento", "ilustracion"]).flat());
    // Cada capítulo abre con el adorno recortado (sin el nombre horneado en la imagen) y luego el título.
    expect(libro.blocks[0]).toMatchObject({ type: "image", role: "ornamento", decorative: true });
    expect(libro.blocks[0]).toHaveProperty("crop");
    expect(libro.blocks[1]).toMatchObject({ type: "heading", level: 2 });
    expect(libro.blocks[2]).toMatchObject({ type: "image", role: "ilustracion" });
  });
  it("conserva las pausas entre escenas como espacios y no deja ningún párrafo cortado", () => {
    expect((piezas["nahual"] as Pieza).blocks.some((b) => b.type === "spacer")).toBe(true);
    expect(res.issues.filter((i) => i.issue.code === "posible-corte")).toEqual([]);
  });
});
