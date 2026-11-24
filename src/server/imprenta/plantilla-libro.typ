// Plantilla "Cuentos a todas partes" para el libro impreso completo (ADR 0023).
// Calibrada contra el PDF que la editorial mandó a imprimir (EL_PRINCIPE_FELIZ_22OCTUBRE2026.pdf):
// 5.5 × 8.5 in, Libertinus Serif 14/18, márgenes interior 70 / exterior 76 pt, cornisas al 78 % K,
// títulos en Tangerine 48 pt, aperturas en página impar. Medidas: docs/analisis/2026-11-24-pdf-imprenta-el-principe-feliz.md
// Datos: /datos.json (lo arma src/server/imprenta/libro.ts). Imágenes: /img/<archivo>. Logo: /logo.svg
#import "/droplet/lib.typ": dropcap

#let datos = json("/datos.json")
#let negro = cmyk(0%, 0%, 0%, 100%) // texto en 100 % K, nunca negro enriquecido
#let gris-cornisa = cmyk(0%, 0%, 0%, 78%)
#let FRENTE = 2 // portadilla y página legal: sin cornisa ni folio

#set document(title: datos.titulo, author: datos.autor)
#set text(
  font: "Libertinus Serif",
  size: 14pt,
  lang: "es",
  region: "MX",
  hyphenate: datos.guiones,
  fill: negro,
)
// 14/18 pt, justificado y una línea en blanco entre párrafos (como el impreso)
#set par(justify: true, leading: 18pt - 14pt * 0.75, spacing: 18pt + (18pt - 14pt * 0.75))

// ¿La página n está en blanco? (entre el fin de una pieza y el inicio de la siguiente, o relleno final)
#let es-blanca(n) = {
  let marcas = query(selector(<fin>).or(<apertura>).or(<colofon>))
  let aqui = marcas.filter(m => m.location().page() == n)
  let antes = marcas.filter(m => m.location().page() < n)
  aqui.len() == 0 and antes.len() > 0 and antes.last().value == "fin"
}
#let es-portadilla(n) = query(<portadilla>).any(m => m.location().page() == n)
#let es-apertura(n) = query(<apertura>).any(m => m.location().page() == n)
#let es-colofon(n) = query(<colofon>).any(m => m.location().page() == n)

#let cornisa(cuerpo) = text(size: 8pt, tracking: 0.08em, fill: gris-cornisa, upper(cuerpo))

#let compacto = datos.at("margenes", default: "clasico") == "compacto"
#let margenes = if compacto {
  (inside: 54pt, outside: 50pt, top: 78pt, bottom: 58pt)
} else {
  (inside: 70pt, outside: 76pt, top: 106pt, bottom: 76pt)
}

#set page(
  width: 5.5in,
  height: 8.5in,
  margin: margenes,
  header-ascent: 40%,
  header: context {
    let n = here().page()
    if n > FRENTE and not es-blanca(n) and not es-apertura(n) and not es-portadilla(n) and not es-colofon(n) {
      align(center, if calc.even(n) { cornisa(datos.autor) } else { cornisa(datos.titulo) })
    }
  },
  footer-descent: 35%,
  footer: context {
    let n = here().page()
    if n > FRENTE and not es-blanca(n) and not es-portadilla(n) and not es-colofon(n) {
      align(center, text(style: "italic", size: 12pt, str(n)))
    }
  },
)

// Texto en línea: tramos con cursiva, negrita y versalitas
#let linea(runs) = {
  for r in runs {
    let c = [#r.t]
    if r.at("sc", default: false) { c = smallcaps(c) }
    if r.at("i", default: false) { c = emph(c) }
    if r.at("b", default: false) { c = strong(c) }
    c
  }
}

#let imagen(b) = {
  let w = b.w * 1pt
  let img = if b.hTotal == none {
    image(b.ruta, width: w)
  } else {
    // Recorte: solo una banda de la imagen (p. ej. los pájaros de una tarjeta de capítulo)
    box(width: w, height: b.h * 1pt, clip: true, move(dy: b.dy * 1pt, image(b.ruta, width: w, height: b.hTotal * 1pt)))
  }
  block(width: 100%, breakable: false, above: 1.2em, below: 1.2em, align(center, img))
}

#let bloque(b, abriendo: false) = {
  if b.tipo == "titulo" {
    if b.nivel == 1 {
      block(width: 100%, above: if abriendo { 0pt } else { 2em }, below: 0.5in, breakable: false,
        align(center, text(font: "Tangerine", size: 48pt, weight: "regular", hyphenate: false, linea(b.runs))))
    } else if b.nivel == 2 {
      block(width: 100%, above: 2.2em, below: 1.2em, breakable: false, sticky: true,
        align(center, text(size: 17pt, hyphenate: false, linea(b.runs))))
    } else {
      block(width: 100%, above: 2em, below: 0.6em, sticky: true,
        align(center, text(size: 8pt, tracking: 0.25em, fill: gris-cornisa, upper(linea(b.runs)))))
    }
  } else if b.tipo == "parrafo" {
    let sangria = if b.sangria { 1em } else { 0pt }
    if b.capitular != none {
      // Capitular descolgada 3 líneas (paquete droplet, equivalente a Libertinus 69.6 pt del impreso real)
      dropcap(
        height: 3,
        gap: 1.5pt,
        justify: b.alinear == "justify",
        b.capitular,
        linea(b.runs),
      )
    } else if b.alinear == "justify" {
      par(first-line-indent: (amount: sangria, all: true), linea(b.runs))
    } else {
      let lado = if b.alinear == "center" { center } else if b.alinear == "right" { right } else { left }
      align(lado, par(justify: false, first-line-indent: 0pt, linea(b.runs)))
    }
  } else if b.tipo == "firma" {
    block(width: 100%, above: 1.4em, breakable: false, align(right, {
      emph(linea(b.runs))
      if b.credito != none { linebreak(); text(size: 11pt, b.credito) }
    }))
  } else if b.tipo == "ornamento" {
    block(width: 100%, above: 2em, align(center, text(style: "italic", b.texto)))
  } else if b.tipo == "espacio" {
    v(18pt)
  } else if b.tipo == "imagen" {
    imagen(b)
  }
}

// ------------------------------------------------------------------ portadilla y página legal
#page(header: none, footer: none)[
  #v(1.9in)
  #align(center, text(font: "Tangerine", size: 54pt, hyphenate: false, datos.titulo))
  #v(1fr)
  #align(center, image("/logo.svg", width: 0.85in))
  #v(0.3in)
]
#page(header: none, footer: none)[
  #v(1fr)
  #set text(size: 8pt)
  #set par(justify: false, leading: 0.55em, spacing: 0.55em)
  #for l in datos.legal { if l == "" { v(0.6em) } else { par(l) } }
]

// ------------------------------------------------------------------ piezas
#for p in datos.piezas {
  pagebreak(to: "odd", weak: true)
  [#metadata("apertura") <apertura>]
  if p.conPortadilla {
    // Portadilla de página completa (como la del prólogo en el impreso); el texto sigue en la siguiente
    [#metadata("portadilla") <portadilla>]
    v(0.2in)
    for b in p.apertura { bloque(b, abriendo: true) }
    pagebreak()
  } else {
    v(if compacto { 0.35in } else { 0.55in })
    for b in p.apertura { bloque(b, abriendo: true) }
  }
  for b in p.cuerpo { bloque(b) }
  [#metadata("fin") <fin>]
}

// ------------------------------------------------------------------ relleno y colofón
// `saltos` lo calcula el servidor en dos pasadas (src/server/imprenta/compilar.ts): las páginas en
// blanco necesarias para que el colofón caiga en la última página (múltiplo de 4 si se pidió).
#if datos.saltos > 0 {
  for _ in range(datos.saltos) { pagebreak() }
  [#metadata("colofon") <colofon>]
  v(1fr)
  set text(size: 9pt, style: "italic")
  set par(justify: false, leading: 0.5em, spacing: 0.5em)
  align(center, { for l in datos.colofon { if l == "" { v(0.5em) } else { par(l) } } })
}
