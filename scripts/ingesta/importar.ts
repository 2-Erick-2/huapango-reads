/**
 * Comando: importa una obra a formato canónico.
 *
 *   node scripts/ingesta/importar.ts contenido-privado/nahual/mapeo.json
 *   node scripts/ingesta/importar.ts contenido-privado/nahual/mapeo.json --sin-escribir
 *
 * Solo escribe en disco si TODA la verificación de integridad pasa.
 */
import { escribirObra, importarObra } from "./obra.ts";

const [mapeoPath, ...flags] = process.argv.slice(2);
if (!mapeoPath) {
  console.error("Uso: node scripts/ingesta/importar.ts <mapeo.json> [--sin-escribir]");
  process.exit(2);
}

try {
  const res = importarObra(mapeoPath);

  console.log(
    `\nObra: ${res.mapeo.obra}   Fuentes: ${res.fuentes.map((f) => f.archivo).join(", ")}\n`,
  );
  for (const p of res.piezas) {
    console.log(
      `  ${p.slug.padEnd(16)} ${String(p.stats.words).padStart(6)} palabras  ${String(p.stats.paragraphs).padStart(4)} párrafos  ${String(p.stats.minutes).padStart(3)} min  ${p.credit ?? ""}`,
    );
  }
  console.log("");
  for (const c of res.checks) {
    const mark = c.ok ? "OK " : c.nivel === "error" ? "ERR" : "AVI";
    console.log(`  [${mark}] ${c.nombre}\n        ${c.detalle}`);
  }
  for (const { slug, issue } of res.issues.filter((i) => i.issue.level === "error")) {
    console.log(`  [ERR] ${slug} ${issue.id ?? ""}: ${issue.message}`);
  }

  if (!res.ok) {
    console.error("\nLa importación tiene errores: no se escribió nada.");
    process.exitCode = 1;
  } else if (flags.includes("--sin-escribir")) {
    console.log("\nSin errores (modo --sin-escribir: no se escribió nada).");
  } else {
    const out = escribirObra(res, mapeoPath);
    console.log(`\nListo. Escrito en ${out}`);
  }
} catch (error) {
  console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
