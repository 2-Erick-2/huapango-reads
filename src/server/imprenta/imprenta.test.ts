import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { Pieza } from "~/lib/libro/types";
import { compilarLibro } from "./compilar";
import { generarPdfDePiezas } from "./exportar";
import { imponerFolleto, ordenFolleto } from "./folleto";
import { aRuns, armarLibro, legalPropuesta, medirImagen, ordenDeImpresion } from "./libro";
import { infoDeImagen } from "./imagenes";

const leer = (obra: string, slug: string) =>
  JSON.parse(readFileSync(`public/contenido/${obra}/${slug}.json`, "utf8")) as Pieza;

function imagenesDe(obra: string, piezas: readonly Pieza[]) {
  const bytes = new Map<string, Uint8Array>();
  for (const p of piezas)
    for (const b of p.blocks)
      if (b.type === "image")
        bytes.set(
          b.asset,
          new Uint8Array(readFileSync(`public/contenido/${obra}/assets/${b.asset}`)),
        );
  const info = new Map([...bytes].map(([n, d]) => [n, infoDeImagen(d)]));
  return { bytes, info };
}

const opciones = {
  titulo: "El príncipe feliz",
  autor: "Oscar Wilde",
  legal: "El príncipe feliz\nOscar Wilde\n\n© 2026 Editorial Huapango",
  colofon: "Impreso en Editorial Huapango.",
  guiones: false,
  multiploDe4: true,
};

describe("folleto (imposición como «Folleto» de Acrobat)", () => {
  it("ordena 62 páginas como el impreso real: 16 hojas, hoja 1 = 64|1 y 2|63, centro = 34|31 y 32|33", () => {
    const caras = ordenFolleto(62).map(([a, b]) => [
      a === null ? null : a + 1,
      b === null ? null : b + 1,
    ]);
    expect(caras).toHaveLength(32);
    expect(caras[0]).toEqual([null, 1]); // la 64 es blanca
    expect(caras[1]).toEqual([2, null]); // la 63 es blanca
    expect(caras[30]).toEqual([34, 31]);
    expect(caras[31]).toEqual([32, 33]);
    // cada página aparece exactamente una vez
    const todas = caras
      .flat()
      .filter((x): x is number => x !== null)
      .sort((a, b) => a - b);
    expect(todas).toEqual(Array.from({ length: 62 }, (_, i) => i + 1));
  });
});

describe("armar el libro", () => {
  it("convierte cursiva, negrita y versalitas a tramos", () => {
    expect(
      aRuns(["Hola ", { em: ["mundo ", { strong: ["fuerte"] }] }, { smallCaps: ["sc"] }]),
    ).toEqual([
      { t: "Hola " },
      { t: "mundo ", i: true },
      { t: "fuerte", i: true, b: true },
      { t: "sc", sc: true },
    ]);
  });

  it("pone prólogo y notas antes del libro, y epílogo y análisis después", () => {
    const p = (title: string, kind: Pieza["kind"]) => ({ title, kind });
    const orden = ordenDeImpresion([
      p("Nahual", "libro"),
      p("Prólogo", "complemento"),
      p("Nota del autor", "complemento"),
      p("Epílogo", "complemento"),
      p("Análisis visual de la obra", "complemento"),
    ]).map((x) => x.title);
    expect(orden).toEqual([
      "Prólogo",
      "Nota del autor",
      "Nahual",
      "Epílogo",
      "Análisis visual de la obra",
    ]);
  });

  it("calcula el tamaño impreso de una imagen y avisa si queda por debajo de 300 ppp", () => {
    const chica = medirImagen(
      { role: "ilustracion", widthPct: 100, crop: undefined },
      { ancho: 600, alto: 400 },
    );
    expect(chica.w).toBe(250);
    expect(chica.ppp).toBeLessThan(300);
    const grande = medirImagen(
      { role: "divisor", widthPct: 30, crop: undefined },
      { ancho: 900, alto: 100 },
    );
    expect(grande.ppp).toBeGreaterThanOrEqual(300);
  });

  it("inserta puntos de quiebre suaves solo en tokens sin espacios de 26+ caracteres", () => {
    expect(aRuns(["Palabra normal y " + "a".repeat(30)])).toEqual([
      { t: "Palabra normal y " + "a".repeat(20) + "\u200B" + "a".repeat(10) },
    ]);
  });

  it("propone una página legal solo con datos conocidos", () => {
    const t = legalPropuesta({
      titulo: "El príncipe feliz",
      autor: "Oscar Wilde",
      creditos: [{ rol: "Traducción", nombre: "Yarely Isabel Campos Servín" }],
      coleccion: "Cuentos a todas partes",
      anio: 2026,
    });
    expect(t).toContain("Traducción: Yarely Isabel Campos Servín");
    expect(t).toContain("© 2026 Editorial Huapango");
  });
});

describe("PDF de imprenta real: El príncipe feliz completo", () => {
  const piezas = ordenDeImpresion(
    [
      "el-principe-feliz",
      "el-principe-feliz-prologo",
      "el-principe-feliz-nota-de-la-traductora",
    ].map((s) => leer("el-principe-feliz", s)),
  );
  const { bytes, info } = imagenesDe("el-principe-feliz", piezas);

  it("compila el libro completo en media carta, múltiplo de 4, y lo impone en hojas carta", async () => {
    const { datos, faltantes } = armarLibro(piezas, opciones, info);
    expect(faltantes).toEqual([]);
    expect(datos.piezas.map((p) => p.titulo)).toEqual([
      "Prólogo",
      "Nota de la traductora",
      "El príncipe feliz",
    ]);
    expect(datos.piezas[0]?.conPortadilla).toBe(true);
    const { pdf, paginas } = await compilarLibro(datos, bytes);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    expect(paginas % 4).toBe(0);
    // El impreso real tiene 62 (64 con las blancas de Acrobat); con las mismas medidas debe quedar cerca
    expect(paginas).toBeGreaterThanOrEqual(44);
    expect(paginas).toBeLessThanOrEqual(72);
    const doc = await PDFDocument.load(pdf);
    for (const p of doc.getPages()) {
      expect(Math.round(p.getWidth())).toBe(396);
      expect(Math.round(p.getHeight())).toBe(612);
    }
    const folleto = await imponerFolleto(pdf);
    expect(folleto.hojas).toBe(paginas / 4);
    const docF = await PDFDocument.load(folleto.pdf);
    expect(docF.getPageCount()).toBe(paginas / 2);
    expect(Math.round(docF.getPage(0).getWidth())).toBe(792);
    expect(Math.round(docF.getPage(0).getHeight())).toBe(612);
  }, 120_000);

  it("sin completar a múltiplo de 4, termina donde termina el texto", async () => {
    const { datos } = armarLibro(piezas, { ...opciones, multiploDe4: false, colofon: "" }, info);
    const { paginas } = await compilarLibro(datos, bytes);
    const conRelleno = await compilarLibro(armarLibro(piezas, opciones, info).datos, bytes);
    expect(paginas).toBeLessThan(conRelleno.paginas);
  }, 120_000);

  it("Nahual: 5 piezas, tarjetas de capítulo recortadas y 12 imágenes", async () => {
    const slugs = [
      "nahual-prologo",
      "nahual-nota-del-autor",
      "nahual",
      "nahual-epilogo",
      "nahual-analisis-visual",
    ];
    const pn = ordenDeImpresion(slugs.map((s) => leer("nahual", s)));
    const im = imagenesDe("nahual", pn);
    const { datos, faltantes } = armarLibro(
      pn,
      { ...opciones, titulo: "Nahual", autor: "Luis Armando Rosado" },
      im.info,
    );
    expect(faltantes).toEqual([]);
    const { paginas, advertencias } = await compilarLibro(datos, im.bytes);
    expect(advertencias).toEqual([]);
    expect(paginas % 4).toBe(0);
    expect(paginas).toBeGreaterThan(60);
  }, 120_000);

  it("exportación de piezas: compila capitular con droplet y genera folleto listo", async () => {
    const res = await generarPdfDePiezas(piezas, bytes, {
      ...opciones,
      obraSlug: "el-principe-feliz",
      formato: "folleto",
      desplazamientoMm: 0.75,
    });
    expect(res.nombreArchivo).toBe("el-principe-feliz-folleto.pdf");
    expect(res.faltantes).toEqual([]);
    expect(res.advertencias).toEqual([]);
    expect(res.hojas).toBe(res.paginas / 4);
    expect(res.caras).toBe(res.paginas / 2);
    expect(new TextDecoder().decode(res.pdf.slice(0, 5))).toBe("%PDF-");
  }, 120_000);

  it("los márgenes compactos aprovechan más la hoja (menos páginas que el clásico)", async () => {
    const clasico = await generarPdfDePiezas(piezas, bytes, {
      ...opciones,
      multiploDe4: false,
      colofon: "",
      margenes: "clasico",
      obraSlug: "el-principe-feliz",
      formato: "media-carta",
    });
    const compacto = await generarPdfDePiezas(piezas, bytes, {
      ...opciones,
      multiploDe4: false,
      colofon: "",
      margenes: "compacto",
      obraSlug: "el-principe-feliz",
      formato: "media-carta",
    });
    expect(compacto.paginas).toBeLessThan(clasico.paginas);
  }, 120_000);
});
