// Plantilla de prototipo: "Cuentos a todas partes", 5.5 × 8.5 in (medida deducida de la página 1 exportada: 825×1275 px a 150 ppp)
// Capitular: pendiente (paquete droplet no disponible en esta sesión); aquí va una versal sin descolgar
#let negro = cmyk(0%, 0%, 0%, 100%)   // texto en negro 100 % K, nunca negro enriquecido
#let libro = json("libro.json")
#set document(title: libro.title, author: libro.author)
#set page(
  width: 5.5in, height: 8.5in,
  margin: (inside: 0.9in, outside: 0.8in, top: 0.85in, bottom: 1in),
  footer: context align(center, text(font: "Libertinus Serif", style: "italic", size: 10pt, fill: negro, counter(page).display())),
)
#set text(font: "Libertinus Serif", size: 12.5pt, lang: "es", region: "MX", hyphenate: true, fill: negro)
#set par(justify: true, leading: 0.62em, first-line-indent: (amount: 1.2em, all: false), spacing: 0.62em)
#for b in libro.blocks {
  if b.type == "heading" {
    v(1.6in)
    align(center, text(font: "Tangerine", size: 44pt, b.text))
    v(0.45in)
  } else if b.type == "ornament" {
    v(1em); align(center, text(style: "italic", b.text))
  } else if b.dropCap {
    par(first-line-indent: 0pt)[#text(size: 2.2em, baseline: -0.05em, b.text.first())#b.text.slice(b.text.first().len())]
  } else {
    par(b.text)
  }
}
