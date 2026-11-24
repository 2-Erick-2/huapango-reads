/**
 * Comando: importa TODAS las obras de `contenido-privado/` y publica su contenido canónico para la app.
 *
 *   npm run contenido:publicar
 *
 * Por cada `contenido-privado/<obra>/mapeo.json`:
 *   1. Importa y verifica la obra (si la verificación falla, no se publica nada de ella y el comando falla).
 *   2. Escribe el resultado completo y auditable en `contenido-privado/<obra>/canonico/`.
 *   3. Copia lo que necesita el lector a `public/contenido/<obra>/` (piezas en JSON compacto + imágenes).
 *
 * Una obra escrita en el panel (un libro o un ensayo nuevo) llega como `contenido-privado/<obra>/paquete.json`
 * (ADR 0019): se valida con las mismas reglas y se publica igual, sin imágenes por ahora.
 * Al final genera `src/lib/contenido/manifests.generated.ts`, un manifiesto pequeño que la app importa
 * para saber qué piezas tiene cada obra sin hacer una petición de red (también en el servidor).
 *
 * `public/contenido/` y el manifiesto generado se versionan: así la app compila sin depender de
 * `contenido-privado/` (que solo existe donde la editorial entregó los archivos).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  manifestDePaquete,
  validarPaquete,
  type PaqueteObra,
} from "../../src/lib/libro/paquete.ts";
import type { Manifest } from "../../src/lib/libro/types.ts";
import { escribirObra, importarObra, manifestDe } from "../ingesta/obra.ts";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const origen = join(raiz, "contenido-privado");
const destino = join(raiz, "public", "contenido");
const generado = join(raiz, "src", "lib", "contenido", "manifests.generated.ts");

const obras = readdirSync(origen, { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      (existsSync(join(origen, d.name, "mapeo.json")) ||
        existsSync(join(origen, d.name, "paquete.json"))),
  )
  .map((d) => d.name)
  .sort();

if (obras.length === 0) {
  console.error(`No hay obras con mapeo.json ni paquete.json en ${origen}`);
  process.exit(1);
}

const manifiestos: Record<string, Manifest> = {};
let fallas = 0;

for (const obra of obras) {
  const mapeoPath = join(origen, obra, "mapeo.json");
  const paquetePath = join(origen, obra, "paquete.json");
  if (!existsSync(mapeoPath)) {
    try {
      let texto = readFileSync(paquetePath, "utf8");
      if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1); // BOM que agregan algunos editores de Windows
      const paquete = JSON.parse(texto) as PaqueteObra;
      const errores = validarPaquete(paquete);
      if (paquete.obra !== obra)
        errores.push(`El paquete dice "${paquete.obra}" pero está en la carpeta "${obra}"`);
      if (errores.length > 0) {
        fallas += 1;
        console.error(`✗ ${obra}: el paquete no es publicable, no se publica.`);
        for (const e of errores) console.error(`    - ${e}`);
        continue;
      }
      const out = join(destino, obra);
      rmSync(out, { recursive: true, force: true });
      mkdirSync(join(out, "assets"), { recursive: true });
      for (const pieza of paquete.piezas)
        writeFileSync(join(out, `${pieza.slug}.json`), JSON.stringify(pieza));
      const manifest = manifestDePaquete(paquete);
      writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest));
      manifiestos[obra] = manifest;
      const palabras = paquete.piezas.reduce((n, p) => n + p.stats.words, 0);
      console.log(
        `✓ ${obra} (${paquete.tipo}, paquete): ${paquete.piezas.length} pieza(s), ${palabras} palabras`,
      );
    } catch (error) {
      fallas += 1;
      console.error(`✗ ${obra}: ${error instanceof Error ? error.message : String(error)}`);
    }
    continue;
  }
  try {
    const res = importarObra(mapeoPath);
    const malos = res.checks.filter((c) => !c.ok && c.nivel === "error");
    const errores = res.issues.filter((i) => i.issue.level === "error");
    if (!res.ok) {
      fallas += 1;
      console.error(`✗ ${obra}: la verificación falló, no se publica.`);
      for (const c of malos) console.error(`    - ${c.nombre}: ${c.detalle}`);
      for (const e of errores)
        console.error(`    - ${e.slug} ${e.issue.id ?? ""}: ${e.issue.message}`);
      continue;
    }
    escribirObra(res, mapeoPath);

    const out = join(destino, obra);
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, "assets"), { recursive: true });
    for (const pieza of res.piezas)
      writeFileSync(join(out, `${pieza.slug}.json`), JSON.stringify(pieza));
    const manifest = manifestDe(res);
    writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest));
    for (const [name, data] of res.assets) writeFileSync(join(out, "assets", name), data);
    manifiestos[obra] = manifest;

    const avisos = res.checks.filter((c) => !c.ok && c.nivel === "advertencia").length;
    const palabras = res.piezas.reduce((n, p) => n + p.stats.words, 0);
    console.log(
      `✓ ${obra}: ${res.piezas.length} pieza(s), ${palabras} palabras, ${res.assets.size} imagen(es)${avisos ? `, ${avisos} aviso(s)` : ""}`,
    );
  } catch (error) {
    fallas += 1;
    console.error(`✗ ${obra}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (fallas > 0) {
  console.error(`\n${fallas} obra(s) con errores. No se generó el manifiesto.`);
  process.exit(1);
}

const cuerpo = `/**
 * GENERADO por \`npm run contenido:publicar\`. No editar a mano.
 * Qué piezas tiene cada obra (sin el texto, que se carga bajo demanda desde public/contenido/).
 */
import type { Manifest } from "../libro/types.ts";

export const MANIFESTS: Readonly<Record<string, Manifest>> = ${JSON.stringify(manifiestos, null, 2)};
`;
mkdirSync(dirname(generado), { recursive: true });
writeFileSync(generado, cuerpo);

// Verificación final: lo que quedó en public/ es exactamente lo que dice el manifiesto.
for (const [obra, manifest] of Object.entries(manifiestos)) {
  for (const piece of manifest.pieces) {
    const file = join(destino, obra, piece.file);
    if (!existsSync(file)) throw new Error(`Falta ${file}`);
    JSON.parse(readFileSync(file, "utf8"));
  }
}
console.log(`\nManifiesto escrito en ${generado}`);
