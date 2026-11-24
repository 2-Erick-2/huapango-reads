import { describe, expect, it } from "vitest";
import { BOOKS } from "./data";
import { combinarCatalogo, type FilaObraCatalogo } from "./index";

describe("combinación de catálogo local y Supabase", () => {
  it("actualiza metadatos editoriales de un libro existente sin perder su portada local", () => {
    const local = BOOKS[0];
    if (!local) throw new Error("Falta libro base");
    const fila: FilaObraCatalogo = {
      slug: local.slug,
      titulo: local.title,
      subtitulo: "Edición revisada",
      autores: null,
      coleccion: local.collection,
      sinopsis: "",
      cita: "Cita actualizada desde el panel",
      generos: ["Relato"],
      precio_digital_mxn: 120,
      isbn_digital: "978-607-00-0001-0",
      fecha_publicacion: "2026-11-20",
      portada_ruta: null,
    };

    const resultado = combinarCatalogo([local], [fila]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.subtitle).toBe("Edición revisada");
    expect(resultado[0]?.digitalPriceMXN).toBe(120);
    expect(resultado[0]?.digitalIsbn).toBe("978-607-00-0001-0");
    expect(resultado[0]?.cover.jpg).toBe(local.cover.jpg);
    expect(resultado[0]?.print).toEqual(local.print);
  });

  it("agrega libros publicados en la nube con respaldo tipográfico cuando no hay portada", () => {
    const nuevo: FilaObraCatalogo = {
      slug: "antologia-norte",
      titulo: "Antología del norte",
      subtitulo: null,
      autores: ["Mariana Treviño"],
      coleccion: "ecos",
      sinopsis: "Voces contemporáneas de la frontera.",
      cita: null,
      generos: ["Cuento", "Frontera"],
      precio_digital_mxn: 99,
      isbn_digital: null,
      fecha_publicacion: "2026-11-24",
      portada_ruta: null,
      piezas: [
        {
          slug: "antologia-norte",
          titulo: "Antología del norte",
          tipo: "libro",
          firma: null,
          orden: 0,
          version_publicada: "v1",
        },
        {
          slug: "prologo",
          titulo: "Prólogo",
          tipo: "complemento",
          firma: "Luis Armando Rosado",
          orden: 1,
          version_publicada: "v2",
        },
      ],
    };

    const base = BOOKS[0];
    if (!base) throw new Error("Falta libro base");
    const resultado = combinarCatalogo([base], [nuevo]);
    expect(resultado).toHaveLength(2);
    const agregado = resultado[1];
    expect(agregado).toBeDefined();
    expect(agregado?.fromCloud).toBe(true);
    expect(agregado?.cover.jpg).toBe("");
    expect(agregado?.read).toEqual({ obra: "antologia-norte", slug: "antologia-norte" });
    expect(agregado?.cloudPieces).toHaveLength(1);
    expect(agregado?.digitalPriceMXN).toBe(99);
  });
});
