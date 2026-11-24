import { describe, expect, it } from "vitest";
import { parseMapeo } from "./mapeo.ts";

const libro = { slug: "mi-obra", tipo: "libro", titulo: "Mi obra", desde: "Inicio", hasta: "FIN" };
const prologo = {
  slug: "mi-obra-prologo",
  tipo: "complemento",
  titulo: "Prólogo",
  desde: "Prólogo",
  hasta: "Ana",
  portadilla: "img/t.png",
  colocar: [{ imagen: "img/d.png", despues: "Prólogo" }],
};
const imagenes = {
  "img/t.png": { rol: "titulo", texto: "Prólogo" },
  "img/d.png": { rol: "divisor" },
};

interface Variante {
  raiz?: Record<string, unknown>;
  fuente?: Record<string, unknown>;
  masFuentes?: unknown[];
}

/** Un mapeo válido al que se le puede cambiar solo lo que cada prueba necesita. */
function mapeo(v: Variante = {}): unknown {
  return {
    obra: "mi-obra",
    ...v.raiz,
    fuentes: [
      {
        archivo: "epub/uno.epub",
        clases: { P1: "titulo1" },
        textos: { FIN: "ornamento" },
        imagenes,
        piezas: [libro, prologo],
        ...v.fuente,
      },
      ...(v.masFuentes ?? []),
    ],
  };
}

describe("parseMapeo", () => {
  it("acepta un mapeo válido", () => {
    const m = parseMapeo(mapeo());
    expect(m.obra).toBe("mi-obra");
    expect(m.fuentes[0]?.piezas).toHaveLength(2);
    expect(m.fuentes[0]?.piezas[1]?.colocar).toEqual([{ imagen: "img/d.png", despues: "Prólogo" }]);
  });

  it("rechaza campos desconocidos, para que un error de dedo no se ignore", () => {
    expect(() => parseMapeo(mapeo({ raiz: { extra: 1 } }))).toThrow(/campo desconocido/);
    expect(() => parseMapeo(mapeo({ fuente: { clasess: {} } }))).toThrow(/clasess/);
  });

  it("exige exactamente un libro en toda la obra", () => {
    expect(() => parseMapeo(mapeo({ fuente: { piezas: [prologo] } }))).toThrow(/exactamente una/);
    expect(() =>
      parseMapeo(mapeo({ fuente: { piezas: [libro, { ...prologo, tipo: "libro" }] } })),
    ).toThrow(/exactamente una/);
  });

  it("rechaza slugs repetidos, también entre fuentes", () => {
    const otraFuente = {
      archivo: "epub/dos.epub",
      piezas: [{ ...prologo, slug: "mi-obra", portadilla: undefined, colocar: undefined }],
    };
    expect(() => parseMapeo(mapeo({ masFuentes: [otraFuente] }))).toThrow(/repetido/);
  });

  it("valida los roles de clases, textos e imágenes", () => {
    expect(() => parseMapeo(mapeo({ fuente: { clases: { P2: "inventado" } } }))).toThrow(
      /rol inválido/,
    );
    expect(() => parseMapeo(mapeo({ fuente: { textos: { FIN: "titulo9" } } }))).toThrow(
      /rol inválido/,
    );
    expect(() =>
      parseMapeo(mapeo({ fuente: { imagenes: { ...imagenes, "img/t.png": { rol: "magia" } } } })),
    ).toThrow(/rol inválido/);
  });

  it("una imagen de título necesita su texto, y una portadilla debe tener ese rol", () => {
    expect(() =>
      parseMapeo(mapeo({ fuente: { imagenes: { ...imagenes, "img/t.png": { rol: "titulo" } } } })),
    ).toThrow(/necesita "texto"/);
    expect(() =>
      parseMapeo(mapeo({ fuente: { imagenes: { ...imagenes, "img/t.png": { rol: "divisor" } } } })),
    ).toThrow(/portadilla/);
  });

  it("una tarjeta de capítulo necesita su nombre y puede traer un recorte válido", () => {
    const con = (extra: Record<string, unknown>) =>
      mapeo({ fuente: { imagenes: { ...imagenes, "img/c.png": { rol: "capitulo", ...extra } } } });
    expect(() => parseMapeo(con({}))).toThrow(/necesita "texto"/);
    const ok = parseMapeo(con({ texto: "Jornalero", recorte: { desde: 0.05, hasta: 0.4 } }));
    expect(ok.fuentes[0]?.imagenes["img/c.png"]).toEqual({
      rol: "capitulo",
      texto: "Jornalero",
      recorte: { desde: 0.05, hasta: 0.4 },
    });
    expect(() => parseMapeo(con({ texto: "x", recorte: { desde: 0.6, hasta: 0.4 } }))).toThrow(
      /desde < hasta/,
    );
    expect(() => parseMapeo(con({ texto: "x", recorte: { desde: -1, hasta: 0.4 } }))).toThrow(
      /desde < hasta/,
    );
    expect(() => parseMapeo(con({ texto: "x", recorte: { desde: 0, hasta: 2 } }))).toThrow(
      /desde < hasta/,
    );
    expect(() =>
      parseMapeo(
        mapeo({
          fuente: {
            imagenes: {
              ...imagenes,
              "img/d.png": { rol: "divisor", recorte: { desde: 0, hasta: 1 } },
            },
          },
        }),
      ),
    ).toThrow(/solo se usa con el rol "capitulo"/);
  });
  it("valida las colocaciones: imagen declarada, rol colocable y una sola posición", () => {
    const con = (colocar: unknown[]) =>
      mapeo({ fuente: { piezas: [libro, { ...prologo, colocar }] } });
    expect(() => parseMapeo(con([{ imagen: "no-esta.png", alInicio: true }]))).toThrow(
      /no está en "imagenes"/,
    );
    expect(() => parseMapeo(con([{ imagen: "img/t.png", alInicio: true }]))).toThrow(
      /no se coloca/,
    );
    expect(() => parseMapeo(con([{ imagen: "img/d.png", antes: "x", despues: "y" }]))).toThrow(
      /exactamente una posición/,
    );
    expect(() => parseMapeo(con([{ imagen: "img/d.png" }]))).toThrow(/exactamente una posición/);
  });

  it("los contrastes solo pueden nombrar piezas de su propia fuente", () => {
    expect(() =>
      parseMapeo(
        mapeo({ fuente: { contrastes: [{ archivo: "otro.epub", piezas: ["no-existe"] }] } }),
      ),
    ).toThrow(/no tiene la pieza/);
    expect(
      parseMapeo(mapeo({ fuente: { contrastes: [{ archivo: "otro.epub", piezas: ["mi-obra"] }] } }))
        .fuentes[0]?.contrastes,
    ).toEqual([{ archivo: "otro.epub", piezas: ["mi-obra"] }]);
  });

  it("rechaza tipos incorrectos indicando la ruta del problema", () => {
    expect(() => parseMapeo("hola")).toThrow(/debe ser un objeto/);
    expect(() => parseMapeo({ obra: "Mal Slug", fuentes: [] })).toThrow(/obra/);
    expect(() => parseMapeo(mapeo({ fuente: { piezas: [{ ...libro, tipo: "otro" }] } }))).toThrow(
      /tipo/,
    );
    expect(() => parseMapeo(mapeo({ fuente: { piezas: [] } }))).toThrow(/al menos una pieza/);
  });
});
