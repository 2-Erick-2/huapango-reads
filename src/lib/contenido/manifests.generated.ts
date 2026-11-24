/**
 * GENERADO por `npm run contenido:publicar`. No editar a mano.
 * Qué piezas tiene cada obra (sin el texto, que se carga bajo demanda desde public/contenido/).
 */
import type { Manifest } from "../libro/types.ts";

export const MANIFESTS: Readonly<Record<string, Manifest>> = {
  "el-principe-feliz": {
    "version": 1,
    "obra": "el-principe-feliz",
    "pieces": [
      {
        "slug": "el-principe-feliz",
        "kind": "libro",
        "title": "El príncipe feliz",
        "credit": null,
        "file": "el-principe-feliz.json",
        "stats": {
          "words": 3259,
          "paragraphs": 109,
          "minutes": 14
        }
      },
      {
        "slug": "el-principe-feliz-prologo",
        "kind": "complemento",
        "title": "Prólogo",
        "credit": "Mercedes Varela",
        "file": "el-principe-feliz-prologo.json",
        "stats": {
          "words": 357,
          "paragraphs": 4,
          "minutes": 2
        }
      },
      {
        "slug": "el-principe-feliz-nota-de-la-traductora",
        "kind": "complemento",
        "title": "Nota de la traductora",
        "credit": "Yarely Campos Servín",
        "file": "el-principe-feliz-nota-de-la-traductora.json",
        "stats": {
          "words": 824,
          "paragraphs": 12,
          "minutes": 4
        }
      }
    ]
  },
  "nahual": {
    "version": 1,
    "obra": "nahual",
    "pieces": [
      {
        "slug": "nahual-prologo",
        "kind": "complemento",
        "title": "Prólogo",
        "credit": "Ángelus",
        "file": "nahual-prologo.json",
        "stats": {
          "words": 657,
          "paragraphs": 10,
          "minutes": 3
        }
      },
      {
        "slug": "nahual-nota-del-autor",
        "kind": "complemento",
        "title": "Nota del autor",
        "credit": "Luis Armando Rosado Lara",
        "file": "nahual-nota-del-autor.json",
        "stats": {
          "words": 156,
          "paragraphs": 2,
          "minutes": 1
        }
      },
      {
        "slug": "nahual",
        "kind": "libro",
        "title": "Nahual",
        "credit": null,
        "file": "nahual.json",
        "stats": {
          "words": 10051,
          "paragraphs": 114,
          "minutes": 44
        }
      },
      {
        "slug": "nahual-epilogo",
        "kind": "complemento",
        "title": "Epílogo",
        "credit": "Argenis González",
        "file": "nahual-epilogo.json",
        "stats": {
          "words": 542,
          "paragraphs": 11,
          "minutes": 2
        }
      },
      {
        "slug": "nahual-analisis-visual",
        "kind": "complemento",
        "title": "Análisis visual de la obra",
        "credit": "Eduardo Serrato",
        "file": "nahual-analisis-visual.json",
        "stats": {
          "words": 316,
          "paragraphs": 6,
          "minutes": 1
        }
      }
    ]
  }
};
