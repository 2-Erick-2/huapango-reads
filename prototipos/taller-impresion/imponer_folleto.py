#!/usr/bin/env python3
"""Imposición en folleto (cuadernillo a caballo), lo mismo que hace "Folleto" al imprimir en Adobe Acrobat.

Toma un PDF de páginas media carta (5.5 × 8.5 in) y produce hojas carta horizontales (11 × 8.5 in),
con 2 páginas por cara, en el orden necesario para imprimir a doble cara (volteo por el borde corto),
doblar por la mitad y engrapar.

Uso:
    .venv/bin/python imponer_folleto.py entrada.pdf salida.pdf [--desplazamiento-mm 0.0]

- Si el total de páginas no es múltiplo de 4, agrega páginas en blanco al final (Acrobat hace lo mismo).
- --desplazamiento-mm compensa el "creep" (las hojas de adentro sobresalen al doblar): mueve hacia el lomo
  las páginas de las hojas interiores, de forma proporcional. 0 = sin compensar (como Acrobat por defecto).

Requiere: pypdf (pip install pypdf).
"""

import sys

from pypdf import PageObject, PdfReader, PdfWriter, Transformation

MM = 72 / 25.4


def orden_folleto(n: int) -> list[tuple[int | None, int | None]]:
    """Pares (izquierda, derecha) por cara, en orden de impresión. Índices base 0; None = blanca."""
    total = (n + 3) // 4 * 4
    idx = lambda i: i if i < n else None
    caras = []
    for h in range(total // 4):
        caras.append((idx(total - 1 - 2 * h), idx(2 * h)))  # frente: última | primera
        caras.append((idx(2 * h + 1), idx(total - 2 - 2 * h)))  # vuelta: segunda | penúltima
    return caras


def imponer(entrada: str, salida: str, desplazamiento_mm: float = 0.0) -> int:
    lector = PdfReader(entrada)
    paginas = lector.pages
    w = float(paginas[0].mediabox.width)
    h = float(paginas[0].mediabox.height)
    caras = orden_folleto(len(paginas))
    hojas = len(caras) // 2
    escritor = PdfWriter()
    for c, (izq, der) in enumerate(caras):
        hoja = PageObject.create_blank_page(width=2 * w, height=h)
        # creep: la hoja exterior (0) no se mueve; la más interior se mueve desplazamiento_mm hacia el lomo
        corrimiento = desplazamiento_mm * MM * (c // 2) / max(hojas - 1, 1)
        if izq is not None:
            hoja.merge_transformed_page(paginas[izq], Transformation().translate(corrimiento, 0))
        if der is not None:
            hoja.merge_transformed_page(paginas[der], Transformation().translate(w - corrimiento, 0))
        escritor.add_page(hoja)
    with open(salida, "wb") as f:
        escritor.write(f)
    return len(caras)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    d = float(sys.argv[sys.argv.index("--desplazamiento-mm") + 1]) if "--desplazamiento-mm" in sys.argv else 0.0
    caras = imponer(sys.argv[1], sys.argv[2], d)
    print(f"{caras} caras = {caras // 2} hojas carta a doble cara")
