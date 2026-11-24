import { describe, expect, it } from "vitest";
import {
  cleanText,
  computeStats,
  countWords,
  hashText,
  looksTruncated,
  plainText,
  readingMinutes,
  wordsOf,
} from "./text.ts";
import type { Block } from "./types.ts";

describe("cleanText", () => {
  it("quita guiones suaves y espacios de ancho cero, y colapsa espacios", () => {
    expect(cleanText("so\u00ADli\u200Btaria   y\n\tsola")).toBe("solitaria y sola");
  });

  it("conserva el espacio sin separación, que es intencional", () => {
    expect(cleanText("Sr.\u00A0Pérez")).toBe("Sr.\u00A0Pérez");
  });

  it("normaliza a NFC", () => {
    expect(cleanText("pri\u0301ncipe")).toBe("pr\u00EDncipe");
  });
});

describe("wordsOf / countWords", () => {
  it("separa también por espacio sin separación", () => {
    expect(wordsOf("El\u00A0príncipe  feliz")).toEqual(["El", "príncipe", "feliz"]);
    expect(countWords("   ")).toBe(0);
  });
});

describe("plainText", () => {
  it("aplana énfasis anidados", () => {
    expect(plainText(["Era ", { em: ["muy ", { strong: ["feliz"] }] }, "."])).toBe(
      "Era muy feliz.",
    );
  });
});

describe("hashText", () => {
  it("es estable y distingue textos distintos", () => {
    expect(hashText("hola")).toBe(hashText("hola"));
    expect(hashText("hola")).not.toBe(hashText("hola."));
    expect(hashText("")).toHaveLength(8);
  });
});

describe("looksTruncated", () => {
  it("detecta el corte del normalizador viejo (media frase)", () => {
    expect(looksTruncated("Una vez que se fueron, la golondrina se sintió")).toBe(true);
    expect(looksTruncated("—¡Ay! No tengo más rubíes —exclamó el")).toBe(true);
  });

  it("acepta párrafos que terminan bien", () => {
    expect(looksTruncated("Por todo esto, era muy admirada.")).toBe(false);
    expect(looksTruncated("—Los recuerdos están siempre en nosotros—")).toBe(false);
    expect(looksTruncated("dijo: «Vámonos»")).toBe(false);
    expect(looksTruncated("diciéndose unos a otros:")).toBe(false);
    expect(looksTruncated("")).toBe(false);
  });
});

describe("readingMinutes / computeStats", () => {
  it("nunca baja de 1 minuto y redondea", () => {
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(230 * 14)).toBe(14);
    expect(readingMinutes(230 * 14 + 100)).toBe(14);
  });

  it("cuenta palabras de títulos, párrafos y firmas, pero no de imágenes", () => {
    const blocks: Block[] = [
      { id: "x-1", page: null, type: "heading", level: 1, text: ["Prólogo"] },
      {
        id: "x-2",
        page: null,
        type: "paragraph",
        text: ["Dos palabras"],
        indent: false,
        align: "justify",
        dropCap: false,
        hash: "",
        marks: [],
      },
      { id: "x-3", page: null, type: "byline", text: ["Ángelus"], credit: null, hash: "" },
      {
        id: "x-4",
        page: null,
        type: "image",
        asset: "a.png",
        alt: "",
        role: "divisor",
        decorative: true,
        widthPct: null,
        width: 1,
        height: 1,
      },
    ];
    expect(computeStats(blocks)).toEqual({ words: 4, paragraphs: 1, minutes: 1 });
  });
});
