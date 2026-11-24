/**
 * Comando: muestra la estructura de un EPUB para poder escribir su mapeo.
 *
 *   node scripts/ingesta/inspeccionar.ts epubs/LIBRO.epub            # resumen por clase y lista de imágenes
 *   node scripts/ingesta/inspeccionar.ts epubs/LIBRO.epub --bloques  # además, cada párrafo con su página
 */
import { extractAtoms, type Warning } from "./atoms.ts";
import { readEpub } from "./epub.ts";

const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.error("Uso: node scripts/ingesta/inspeccionar.ts <archivo.epub> [--bloques]");
  process.exit(2);
}

try {
  const epub = readEpub(file);
  const warnings: Warning[] = [];
  console.log(
    `\n${file}\n  título: ${epub.title ?? "(sin título)"}  idioma: ${epub.language ?? "?"}  documentos: ${epub.docs.length}`,
  );

  for (const doc of epub.docs) {
    const atoms = extractAtoms(doc, warnings);
    console.log(`\n== ${doc.href}`);

    const porClase = new Map<
      string,
      { n: number; chars: number; align: string; indent: boolean; ejemplo: string }
    >();
    for (const a of atoms) {
      if (a.kind !== "p") continue;
      const key = a.classes.filter((c) => c !== "P-rrafo-b-sico").join(" ") || `<${a.tag}>`;
      const prev = porClase.get(key);
      if (prev) {
        prev.n += 1;
        prev.chars += a.text.length;
      } else {
        porClase.set(key, {
          n: 1,
          chars: a.text.length,
          align: a.align,
          indent: a.indent,
          ejemplo: a.text.slice(0, 50),
        });
      }
    }
    console.log("  clases de párrafo (clase | párrafos | alineación | sangría | ejemplo):");
    for (const [clase, v] of porClase) {
      console.log(
        `    ${clase.padEnd(22)} ${String(v.n).padStart(4)}  ${v.align.padEnd(8)} ${v.indent ? "sangría" : "sin    "}  "${v.ejemplo}"`,
      );
    }

    const imgs = atoms.filter((a) => a.kind === "img");
    console.log(`  imágenes (${imgs.length}):`);
    for (const i of imgs)
      console.log(
        `    ${i.src}  ancho=${i.widthPct ?? "natural"}${i.alt ? `  alt="${i.alt}"` : ""}`,
      );

    if (flags.includes("--bloques")) {
      console.log("  bloques:");
      atoms.forEach((a, n) => {
        if (a.kind === "img")
          console.log(
            `    #${String(n).padStart(3)} pág ${String(a.page ?? "?").padStart(3)} IMG ${a.src}`,
          );
        else {
          const marks = a.marks.length > 0 ? ` +${a.marks.length} marca(s) de página` : "";
          console.log(
            `    #${String(n).padStart(3)} pág ${String(a.page ?? "?").padStart(3)} ${(a.classes.filter((c) => c !== "P-rrafo-b-sico").join(".") || a.tag).padEnd(18)} ${a.text === "" ? "(vacío)" : a.text.slice(0, 70)}${marks}`,
          );
        }
      });
    }
  }

  const unique = [...new Set(warnings.map((w) => `${w.code}: ${w.message}`))];
  if (unique.length > 0) {
    console.log("\nAvisos:");
    for (const w of unique) console.log(`  - ${w}`);
  }
} catch (error) {
  console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
