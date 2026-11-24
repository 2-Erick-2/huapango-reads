// Plantilla "Cuentos a todas partes", calibrada contra el PDF que Huapango mandó a imprimir
// (EL_PRINCIPE_FELIZ_22OCTUBRE2026.pdf, InDesign 21.6). Medidas en docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md.
// Datos de entrada: libro.json (bloques canónicos) y, opcional, --input autor=… --input titulo=… para las cornisas.

#let negro = cmyk(0%, 0%, 0%, 100%) // el impreso usa texto en 100 % K
#let gris-cornisa = cmyk(0%, 0%, 0%, 78%) // cornisas al 78 % K, igual que el impreso
#let libro = json("libro.json")
#let autor = sys.inputs.at("autor", default: libro.author)
#let titulo = sys.inputs.at("titulo", default: libro.title)

#set document(title: libro.title, author: libro.author)
// El impreso NO usa guiones de división (InDesign: separación desactivada). Parámetro de plantilla: --input guiones=si para activarlos.
#set text(font: "Libertinus Serif", size: 14pt, lang: "es", region: "MX", hyphenate: sys.inputs.at("guiones", default: "no") == "si", fill: negro)

// Cornisa: autor en páginas pares, título en impares; en versalitas simuladas (8 pt, mayúsculas espaciadas)
#let cornisa(cuerpo) = text(size: 8pt, tracking: 0.08em, fill: gris-cornisa, upper(cuerpo))
#set page(
  width: 5.5in,
  height: 8.5in,
  // Medido: interior ≈ 70 pt, exterior ≈ 76 pt, primera línea a 117.6 pt, folio a ≈ 545 pt
  margin: (inside: 70pt, outside: 76pt, top: 106pt, bottom: 76pt),
  header-ascent: 40%,
  header: context {
    let n = counter(page).get().first()
    if query(selector(heading).before(here())).len() > 0 and query(heading.where(level: 1)).all(h => h.location().page() != n) {
      align(center, if calc.even(n) { cornisa(autor) } else { cornisa(titulo) })
    }
  },
  footer-descent: 35%,
  // El impreso usa Explora 14 pt (OFL; descargar de Google Fonts). Aquí cae a Libertinus cursiva si no está.
  footer: context align(center, text(font: ("Explora", "Libertinus Serif"), style: "italic", size: 12pt, counter(page).display())),
)

// Texto corrido del cuento: 14/18 pt, justificado, sangría de 1 em y una línea en blanco entre párrafos
#set par(justify: true, leading: 18pt - 14pt * 0.75, spacing: 18pt + (18pt - 14pt * 0.75), first-line-indent: (amount: 1em, all: true))
#show heading.where(level: 1): it => {
  pagebreak(to: "odd", weak: true) // los capítulos abren en página impar, como en el impreso
  v(0.9in)
  align(center, text(font: "Tangerine", size: 48pt, weight: "regular", it.body))
  v(0.5in)
}

#for b in libro.blocks {
  if b.type == "heading" {
    heading(level: 1, b.text)
  } else if b.type == "ornament" {
    v(1em)
    align(center, text(style: "italic", b.text))
  } else if b.at("dropCap", default: false) {
    // Capitular: en el impreso es Libertinus 69.6 pt descolgada 3 líneas. Pendiente (ver README); aquí, versal sin descolgar.
    par(first-line-indent: 0pt)[#text(size: 2.2em, baseline: -0.05em, b.text.first())#b.text.slice(b.text.first().len())]
  } else {
    par(b.text)
  }
}
