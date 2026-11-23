#!/usr/bin/env python3
"""Desofusca (algoritmo IDPF) las fuentes LIBRES (OFL) de un EPUB descomprimido. Uso: desofuscar_fuentes.py <epub-descomprimido> <carpeta-salida>.
Solo para fuentes cuya licencia lo permite: las comerciales no se extraen."""
import hashlib, re, sys, pathlib
root = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
opf = (root/'OEBPS/content.opf').read_text()
uid = re.search(r'<dc:identifier id="bookid">([^<]+)<', opf).group(1)
key = hashlib.sha1(re.sub(r'\s', '', uid).encode()).digest()
for name in ['LibertinusSerif-Regular.ttf','LibertinusSerif-Italic.ttf','LibertinusSerif-Bold.ttf','Tangerine-Regular.ttf']:
    data = bytearray((root/'OEBPS/font'/name).read_bytes())
    for i in range(min(1040, len(data))): data[i] ^= key[i % 20]
    (out/name).write_bytes(data); print(name, data[:4].hex())
