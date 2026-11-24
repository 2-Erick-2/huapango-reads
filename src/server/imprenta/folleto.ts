/**
 * Imposición en folleto (cuadernillo a caballo), lo mismo que hace "Folleto" al imprimir en Adobe
 * Acrobat (ADR 0015 y 0023). Toma el PDF media carta (5.5 × 8.5 in) y produce hojas carta
 * horizontales (11 × 8.5 in) con 2 páginas por cara, en el orden para imprimir a doble cara (volteo
 * por el borde corto), doblar por la mitad y engrapar. Es el algoritmo de
 * `prototipos/taller-impresion/imponer_folleto.py`, verificado con el PDF real de El príncipe feliz.
 */
import { PDFDocument } from "pdf-lib";

const MM = 72 / 25.4;

/** Pares (izquierda, derecha) por cara, en orden de impresión. Índices base 0; null = página blanca. */
export function ordenFolleto(n: number): Array<[number | null, number | null]> {
  const total = Math.ceil(n / 4) * 4;
  const idx = (i: number) => (i < n ? i : null);
  const caras: Array<[number | null, number | null]> = [];
  for (let h = 0; h < total / 4; h += 1) {
    caras.push([idx(total - 1 - 2 * h), idx(2 * h)]); // frente: última | primera
    caras.push([idx(2 * h + 1), idx(total - 2 - 2 * h)]); // vuelta: segunda | penúltima
  }
  return caras;
}

/**
 * Impone el PDF. `desplazamientoMm` compensa el "creep" (las hojas de adentro sobresalen al doblar):
 * la hoja exterior no se mueve y la más interior se acerca al lomo esa distancia. 0 = como Acrobat.
 */
export async function imponerFolleto(
  pdf: Uint8Array,
  desplazamientoMm = 0,
): Promise<{ pdf: Uint8Array; caras: number; hojas: number }> {
  const origen = await PDFDocument.load(pdf);
  const salida = await PDFDocument.create();
  const paginas = await salida.embedPages(origen.getPages());
  const primera = paginas[0];
  if (!primera) throw new Error("El PDF no tiene páginas.");
  const { width: w, height: h } = primera;
  const caras = ordenFolleto(paginas.length);
  const hojas = caras.length / 2;
  caras.forEach(([izq, der], c) => {
    const hoja = salida.addPage([2 * w, h]);
    const corrimiento = (desplazamientoMm * MM * Math.floor(c / 2)) / Math.max(hojas - 1, 1);
    const pi = izq === null ? undefined : paginas[izq];
    const pd = der === null ? undefined : paginas[der];
    if (pi) hoja.drawPage(pi, { x: corrimiento, y: 0 });
    if (pd) hoja.drawPage(pd, { x: w - corrimiento, y: 0 });
  });
  salida.setTitle(`${origen.getTitle() ?? "Libro"} — folleto`);
  salida.setProducer("Huapango +reads — taller de impresión");
  return { pdf: await salida.save(), caras: caras.length, hojas };
}
