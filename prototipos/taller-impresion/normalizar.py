#!/usr/bin/env python3
"""Prototipo: XHTML de InDesign -> bloques canónicos (JSON). Mapeo por libro."""
import json, re, sys, xml.etree.ElementTree as ET
NS = {'x': 'http://www.w3.org/1999/xhtml'}
EPUB = '{http://www.idpf.org/2007/ops}type'
src, out = sys.argv[1], sys.argv[2]
# Mapeo propio de ESTE libro (InDesign renombra clases en cada exportación)
MAPEO = {'ParaOverride-1': 'heading', 'ParaOverride-2': 'first', 'ParaOverride-3': 'paragraph',
         'ParaOverride-4': 'paragraph', 'ParaOverride-6': 'backmatter', 'ParaOverride-7': 'backmatter'}
root = ET.parse(src).getroot()
blocks, n, page = [], 0, None
def texto(el):
    parts = []
    for node in el.iter():
        if node.get(EPUB) == 'pagebreak': continue
        if node.text: parts.append(node.text)
        if node.tail and node is not el: parts.append(node.tail)
    return re.sub(r'\s+', ' ', ''.join(parts)).strip()
for el in root.find('x:body', NS).iter():
    tag = el.tag.split('}')[1]
    if el.get(EPUB) == 'pagebreak':
        page = el.get('aria-label'); continue
    if tag != 'p': continue
    cls = (el.get('class') or '').split()
    kind = next((MAPEO[c] for c in cls if c in MAPEO), 'paragraph')
    t = texto(el)
    if not t: continue                       # párrafos vacíos de maquetación
    if kind == 'backmatter': continue        # lanzamientos/colofón: los genera la plataforma
    n += 1
    if kind == 'heading' and t == 'FIN': b = {'type': 'ornament', 'text': t}
    elif kind == 'heading': b = {'type': 'heading', 'level': 1, 'text': t}
    else: b = {'type': 'paragraph', 'text': t, 'indent': kind != 'first', 'dropCap': kind == 'first'}
    b['id'] = f'b{n}'; b['printPage'] = page
    blocks.append(b)
json.dump({'title': 'El príncipe feliz', 'author': 'Oscar Wilde', 'blocks': blocks}, open(out, 'w'), ensure_ascii=False, indent=1)
print(len(blocks), 'bloques;', sum(b['type']=='paragraph' for b in blocks), 'párrafos')
