#!/usr/bin/env python3
"""Analiza un PDF de imprenta de referencia y saca las especificaciones para las plantillas del taller.

Uso:
    .venv/bin/python analizar_pdf_referencia.py <pdf> [--json salida.json]

Requiere: pdfplumber y Pillow (pip), Ghostscript y poppler-utils (pdfinfo, pdffonts, pdfimages).
Solo reporta medidas y metadatos técnicos: NO copia el texto del libro (tiene derechos).
"""

import collections
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import pdfplumber
from PIL import Image

PT_POR_IN = 72
# Fuentes con licencia libre (OFL) conocidas; el resto se marca para revisar licencia.
LIBRES = ("Libertinus", "Tangerine", "Explora", "LibreBaskerville", "EBGaramond", "Newsreader", "PlusJakarta")


def run(*args: str) -> str:
    return subprocess.run(args, capture_output=True, text=True, check=False).stdout


def isbn13_valido(digitos: str) -> bool:
    d = [int(c) for c in digitos if c.isdigit()]
    return len(d) == 13 and sum(x * (1 if i % 2 == 0 else 3) for i, x in enumerate(d)) % 10 == 0


def analizar(ruta: str) -> dict:
    raw = Path(ruta).read_bytes()
    info = run("pdfinfo", "-box", ruta)
    campo = lambda k: (re.search(rf"^{k}:\s*(.+)$", info, re.M) or [None, None])[1]
    cajas = {k: campo(k) for k in ("MediaBox", "TrimBox", "BleedBox")}
    reporte: dict = {
        "archivo": Path(ruta).name,
        "creador": campo("Creator"),
        "productor": campo("Producer"),
        "version_pdf": campo("PDF version"),
        "paginas": int(campo("Pages") or 0),
        "tamano_pt": campo("Page size"),
        "cajas": cajas,
        "sangrado": cajas["BleedBox"] != cajas["TrimBox"],
        "pdfx": {
            "GTS_PDFXVersion": [m.decode() for m in re.findall(rb"GTS_PDFXVersion\s*\(([^)]*)\)", raw)][:1],
            "OutputIntents": raw.count(b"/OutputIntents"),
            "OutputConditionIdentifier": [m.decode() for m in re.findall(rb"/OutputConditionIdentifier\s*\(([^)]*)\)", raw)][:1],
        },
        "espacios_de_color": {k: raw.count(f"/{k}".encode()) for k in ("DeviceRGB", "DeviceCMYK", "DeviceGray", "ICCBased", "Separation")},
        "transparencias": raw.count(b"/SMask") + raw.count(b"/Transparency"),
    }
    reporte["paginas_multiplo_de_4"] = reporte["paginas"] % 4 == 0

    # Fuentes
    fuentes = set()
    for linea in run("pdffonts", ruta).splitlines()[2:]:
        nombre = linea.split()[0].split("+")[-1]
        fuentes.add(nombre)
    reporte["fuentes"] = [
        {"nombre": f, "licencia": "libre (OFL)" if f.startswith(LIBRES) else "REVISAR (posible comercial)"} for f in sorted(fuentes)
    ]

    # Imágenes (resolución efectiva y color)
    imagenes = []
    for linea in run("pdfimages", "-list", ruta).splitlines()[2:]:
        c = linea.split()
        if len(c) >= 14 and c[2] == "image":
            imagenes.append({"pagina": int(c[0]), "px": f"{c[3]}x{c[4]}", "color": c[5], "ppp": int(c[12]), "baja_resolucion": int(c[12]) < 300 and int(c[3]) > 200})
    reporte["imagenes"] = imagenes

    # Tipografía y márgenes con pdfplumber
    pdf = pdfplumber.open(ruta)
    estilos = collections.Counter()
    colores = collections.Counter()
    margenes, interlineas, isbns = [], collections.Counter(), set()
    for i, pg in enumerate(pdf.pages, start=1):
        texto = pg.extract_text() or ""
        isbns.update(re.findall(r"ISBN[:\s]*([\d-]{13,17})", texto))
        cuerpo = [c for c in pg.chars if 10 <= c["size"] <= 16]
        for c in pg.chars:
            estilos[(c["fontname"].split("+")[-1], round(c["size"], 1))] += 1
            colores[str(c.get("non_stroking_color"))] += 1
        if len(cuerpo) > 300:  # página de texto corrido
            margenes.append(
                {
                    "pagina": i,
                    "lado": "impar (recto)" if i % 2 else "par (verso)",
                    "izq": round(min(c["x0"] for c in cuerpo), 1),
                    "der": round(pg.width - max(c["x1"] for c in cuerpo), 1),
                    "sup_texto": round(min(c["top"] for c in cuerpo), 1),
                }
            )
            tops = sorted({round(c["top"], 1) for c in cuerpo})
            interlineas.update(round(b - a, 1) for a, b in zip(tops, tops[1:]))
    reporte["estilos_de_texto_mas_usados"] = [{"fuente": f, "pt": s, "caracteres": n} for (f, s), n in estilos.most_common(12)]
    reporte["colores_de_texto"] = dict(colores.most_common(5))
    reporte["interlineado_pt_mas_comun"] = interlineas.most_common(3)
    reporte["margenes_texto_corrido_pt"] = margenes[:6]
    reporte["isbn"] = [{"isbn": s, "valido": isbn13_valido(s)} for s in sorted(isbns)]

    # Tinta: cobertura promedio por página y TAC máximo por píxel en páginas con color
    tinta = []
    for n, linea in enumerate(run("gs", "-q", "-o", "-", "-sDEVICE=inkcov", ruta).splitlines(), start=1):
        v = [float(x) for x in linea.split()[:4]]
        if sum(v[:3]) > 0.001:
            with tempfile.TemporaryDirectory() as tmp:
                tif = f"{tmp}/p.tif"
                run("gs", "-q", "-o", tif, "-sDEVICE=tiff32nc", "-r100", f"-dFirstPage={n}", f"-dLastPage={n}", ruta)
                tac = max(sum(p) for p in Image.open(tif).get_flattened_data()) / 255 * 100
            tinta.append({"pagina": n, "C": round(v[0] * 100, 1), "M": round(v[1] * 100, 1), "Y": round(v[2] * 100, 1), "K": round(v[3] * 100, 1), "TAC_max": round(tac)})
    reporte["paginas_con_color"] = tinta
    return reporte


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    r = analizar(sys.argv[1])
    salida = json.dumps(r, ensure_ascii=False, indent=2)
    if "--json" in sys.argv:
        Path(sys.argv[sys.argv.index("--json") + 1]).write_text(salida)
    print(salida)
