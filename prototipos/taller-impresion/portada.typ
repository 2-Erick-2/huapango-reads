// Prototipo de portada extendida (contraportada + lomo + portada) con sangrado y marcas de corte.
#let negro = cmyk(0%, 0%, 0%, 100%)
#let terregal = cmyk(10%, 65%, 70%, 10%)
#let corte = (w: 5.5in, h: 8.5in)                 // tamaño final de cada tapa
#let paginas = sys.inputs.at("paginas", default: "14")
#let calibre-mm = 0.1                              // grosor por hoja de papel (lo da la imprenta)
#let lomo = (int(paginas) / 2) * calibre-mm * 1mm  // páginas / 2 = hojas
#let sangrado = 3mm
#let marca = 0.25in                                // zona para marcas de corte
#let ancho = 2 * corte.w + lomo
#set document(title: "El príncipe feliz — portada")
#set page(width: ancho + 2 * (sangrado + marca), height: corte.h + 2 * (sangrado + marca), margin: 0pt)
#set text(font: "Libertinus Serif", lang: "es", fill: negro)
// EAN-13 propio (sin dependencias). ISBN DE EJEMPLO del estándar, no es de Huapango.
#let ean13(code) = {
  let L = ("0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011")
  let G = ("0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111")
  let R = ("1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100")
  let par = ("LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL")
  let d = code.clusters().map(int)
  let bits = "101"
  for i in range(1, 7) { bits += if par.at(d.at(0)).at(i - 1) == "L" { L.at(d.at(i)) } else { G.at(d.at(i)) } }
  bits += "01010"
  for i in range(7, 13) { bits += R.at(d.at(i)) }
  bits += "101"
  let m = 0.33mm
  box(stack(dir: ltr, ..bits.clusters().map(b => rect(width: m, height: 22mm, fill: if b == "1" { negro } else { none }, stroke: none))))
}
#let x0 = marca + sangrado
#let y0 = marca + sangrado
// Fondo de toda la tapa con sangrado
#place(dx: marca, dy: marca, rect(width: ancho + 2 * sangrado, height: corte.h + 2 * sangrado, fill: cmyk(0%, 0%, 4%, 0%), stroke: none))
// Portada (derecha): ilustración a sangre + título
#place(dx: x0 + corte.w + lomo, dy: marca, image("golondrinas.png", width: corte.w + sangrado, height: corte.h + 2 * sangrado, fit: "cover"))
#place(dx: x0 + corte.w + lomo, dy: y0 + 2.6in, box(width: corte.w, align(center)[
  #text(font: "Tangerine", size: 58pt)[El príncipe feliz] \
  #v(4pt) #text(size: 14pt, tracking: 0.1em)[OSCAR WILDE]
]))
// Lomo
#place(dx: x0 + corte.w, dy: y0, rect(width: lomo, height: corte.h, fill: terregal, stroke: none))
// Contraportada (izquierda)
#place(dx: x0 + 0.6in, dy: y0 + 0.9in, box(width: corte.w - 1.2in)[
  #set par(justify: true)
  #text(size: 11pt)[Sinopsis: *por confirmar con la editorial.*]
])
#place(dx: x0 + 0.6in, dy: y0 + corte.h - 1.6in, box(fill: white, inset: 4pt)[#ean13("9783161484100") \ #text(size: 6pt)[ISBN DE EJEMPLO — NO ES REAL]])
// Marcas de corte (fuera del sangrado)
#let mk(x, y, horiz) = place(dx: x, dy: y, line(length: marca - 2pt, angle: if horiz { 0deg } else { 90deg }, stroke: 0.25pt + negro))
#for x in (x0, x0 + ancho) { mk(x, 0pt, false); mk(x, y0 + corte.h + sangrado + 2pt, false) }
#for y in (y0, y0 + corte.h) { mk(0pt, y, true); mk(x0 + ancho + sangrado + 2pt, y, true) }
// Guías del lomo (arriba y abajo)
#for x in (x0 + corte.w, x0 + corte.w + lomo) { mk(x, 0pt, false); mk(x, y0 + corte.h + sangrado + 2pt, false) }
