/**
 * Importación de una obra completa: mapeo + EPUB(s) -> piezas canónicas verificadas.
 * `importarObra` no escribe nada; `escribirObra` guarda el resultado. Se separan para poder probar.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { wordsOf } from "../../src/lib/libro/text.ts";
import type { Manifest, Pieza } from "../../src/lib/libro/types.ts";
import { validatePieza, type Issue } from "../../src/lib/libro/validate.ts";
import { extractAtoms, type Atom, type ImgAtom, type ParaAtom, type Warning } from "./atoms.ts";
import { readEpub } from "./epub.ts";
import { imageInfo } from "./imagen.ts";
import { parseMapeo, type FuenteMapeo, type Mapeo } from "./mapeo.ts";
import { normalizar } from "./normalizar.ts";
import { construirPieza, dividir, type ImagenPreparada } from "./piezas.ts";
import {
  check,
  compararPalabras,
  describirHunk,
  palabrasDeBloques,
  palabrasDeBorradores,
  palabrasDeParrafos,
  palabrasIndependientes,
  type Check,
} from "./verificar.ts";

export interface ImagenInforme {
  fuente: string;
  src: string;
  rol: string;
  /** Pieza donde quedó, o null si no se coloca (título o ignorada) */
  pieza: string | null;
  asset: string | null;
}

export interface FuenteInfo {
  archivo: string;
  sha256: string;
  titulo: string | null;
}

export interface Resultado {
  mapeo: Mapeo;
  fuentes: FuenteInfo[];
  piezas: Pieza[];
  assets: Map<string, Buffer>;
  checks: Check[];
  issues: Array<{ slug: string; issue: Issue }>;
  warnings: Warning[];
  ignorados: ParaAtom[];
  imagenes: ImagenInforme[];
  ok: boolean;
}

const sha8 = (data: Buffer) => createHash("sha256").update(data).digest("hex").slice(0, 8);

export function importarObra(mapeoPath: string): Resultado {
  const base = dirname(resolve(mapeoPath));
  const mapeo = parseMapeo(JSON.parse(readFileSync(mapeoPath, "utf8")) as unknown);
  const libroSlug =
    mapeo.fuentes.flatMap((f) => f.piezas).find((p) => p.tipo === "libro")?.slug ?? "";

  const res: Resultado = {
    mapeo,
    fuentes: [],
    piezas: [],
    assets: new Map(),
    checks: [],
    issues: [],
    warnings: [],
    ignorados: [],
    imagenes: [],
    ok: true,
  };
  const varias = mapeo.fuentes.length > 1;
  for (const fuente of mapeo.fuentes) importarFuente(fuente, base, libroSlug, varias, res);

  res.ok =
    res.checks.every((c) => c.ok || c.nivel === "advertencia") &&
    res.issues.every((i) => i.issue.level !== "error");
  return res;
}

function importarFuente(
  fuente: FuenteMapeo,
  base: string,
  libroSlug: string,
  varias: boolean,
  res: Resultado,
): void {
  const epub = readEpub(resolve(base, fuente.archivo));
  const nombre = basename(epub.file);
  const warnings: Warning[] = [];
  const etiqueta = (texto: string) => (varias ? `${texto} [${nombre}]` : texto);

  const atoms: Atom[] = epub.docs.flatMap((doc) => {
    for (const rule of doc.sheet.unsupported)
      warnings.push({
        code: "css-no-soportado",
        message: `CSS no interpretado en ${doc.href}: ${rule}`,
      });
    return extractAtoms(doc, warnings);
  });
  const stream = normalizar(atoms, fuente, warnings);

  // --- Imágenes: todas deben tener un rol decidido por una persona ---
  const imagenesPorSrc = new Map<string, ImgAtom>();
  for (const img of stream.images) {
    if (imagenesPorSrc.has(img.src))
      warnings.push({
        code: "imagen-repetida",
        message: `La imagen ${img.src} aparece más de una vez; se usa la primera posición declarada`,
      });
    else imagenesPorSrc.set(img.src, img);
  }
  const sinRol = [...imagenesPorSrc.keys()].filter((src) => fuente.imagenes[src] === undefined);
  if (sinRol.length > 0) {
    throw new Error(
      `${nombre}: hay ${sinRol.length} imagen(es) sin rol en el mapeo. Agrégalas a "imagenes" (rol: titulo, portadilla, ilustracion, divisor, ornamento o ignorar):\n` +
        sinRol.map((s) => `  - ${s}`).join("\n"),
    );
  }
  for (const src of Object.keys(fuente.imagenes)) {
    if (!imagenesPorSrc.has(src))
      warnings.push({
        code: "imagen-no-encontrada",
        message: `El mapeo declara ${src} pero ${nombre} no la trae`,
      });
  }

  // --- Corte en piezas ---
  const cortes = dividir(stream.drafts, fuente);

  // --- Preparar solo las imágenes que se colocan ---
  const preparadas = new Map<string, ImagenPreparada>();
  for (const corte of cortes) {
    for (const c of corte.def.colocar ?? []) {
      if (preparadas.has(c.imagen)) continue;
      const atom = imagenesPorSrc.get(c.imagen);
      if (!atom)
        throw new Error(
          `Pieza "${corte.def.slug}": la imagen "${c.imagen}" no existe en ${nombre}`,
        );
      const { data } = epub.readResource(atom.doc, atom.src);
      const info = imageInfo(data, c.imagen);
      const stem =
        basename(c.imagen)
          .replace(/\.[^.]+$/, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "imagen";
      const assetName = `${sha8(data)}-${stem}.${info.ext}`;
      res.assets.set(assetName, data);
      preparadas.set(c.imagen, { assetName, width: info.width, height: info.height });
    }
  }

  // --- Construir y validar ---
  const origen = { file: nombre, sha256: epub.sha256 };
  const construidas = cortes.map((corte) =>
    construirPieza(
      corte.def,
      corte.drafts,
      fuente,
      imagenesPorSrc,
      preparadas,
      origen,
      corte.def.tipo === "complemento" ? libroSlug : null,
    ),
  );
  const piezas = construidas.map((c) => c.pieza);
  const assetNames: ReadonlySet<string> = new Set(res.assets.keys());
  const issues = piezas.flatMap((pieza) =>
    validatePieza(pieza, assetNames).map((issue) => ({ slug: pieza.slug, issue })),
  );

  const usadas = new Set(construidas.flatMap((c) => [...c.imagenesUsadas]));
  const portadillas = new Set(fuente.piezas.flatMap((p) => (p.portadilla ? [p.portadilla] : [])));
  const imagenes: ImagenInforme[] = [...imagenesPorSrc.keys()].map((src) => {
    const rol = fuente.imagenes[src]?.rol ?? "ignorar";
    const duena = construidas.find((c) => c.imagenesUsadas.has(src));
    const pieza =
      duena?.pieza.slug ??
      (rol === "titulo" ? (fuente.piezas.find((p) => p.portadilla === src)?.slug ?? null) : null);
    return { fuente: nombre, src, rol, pieza, asset: preparadas.get(src)?.assetName ?? null };
  });

  // --- Verificación de integridad ---
  const checks: Check[] = [];

  for (const doc of epub.docs) {
    const delDoc = stream.paragraphs.filter((p) => p.doc === doc.href);
    const independiente = palabrasIndependientes(doc.raw);
    const extraidas = palabrasDeParrafos(delDoc);
    const hunks = compararPalabras(independiente, extraidas, 5);
    checks.push(
      check(
        etiqueta(`Texto íntegro en ${doc.href}`),
        "error",
        hunks.length === 0,
        hunks.length === 0
          ? `${extraidas.length} palabras: el conteo independiente del XHTML coincide, en orden, con lo extraído`
          : `Difieren ${hunks.length}+ tramos. Primer tramo: ${describirHunk(hunks[0] ?? { at: 0, a: [], b: [] }, independiente)}`,
      ),
    );
  }

  const todas = palabrasDeParrafos(stream.paragraphs).length;
  const enFlujo = palabrasDeBorradores(stream.drafts).length;
  const enIgnorados = palabrasDeParrafos(stream.ignored).length;
  checks.push(
    check(
      etiqueta("Todo el texto está en una pieza o declarado como ignorado"),
      "error",
      todas === enFlujo + enIgnorados,
      `${todas} palabras = ${enFlujo} en piezas + ${enIgnorados} ignoradas`,
    ),
  );

  const palabrasFlujo = palabrasDeBorradores(stream.drafts);
  const palabrasCortes = cortes.flatMap((c) => palabrasDeBorradores(c.drafts));
  const cobertura = compararPalabras(palabrasFlujo, palabrasCortes, 3);
  checks.push(
    check(
      etiqueta("Las piezas cubren el flujo completo sin repetir ni omitir"),
      "error",
      cobertura.length === 0,
      cobertura.length === 0
        ? `${palabrasCortes.length} palabras en ${cortes.length} pieza(s)`
        : `Difieren ${cobertura.length}+ tramos`,
    ),
  );

  const alteradas = construidas.filter((c, i) => {
    const esperado = palabrasDeBorradores(cortes[i]?.drafts ?? []);
    return compararPalabras(esperado, palabrasDeBloques(c.pieza.blocks, c.injected), 1).length > 0;
  });
  checks.push(
    check(
      etiqueta("Los bloques construidos conservan el texto de cada pieza"),
      "error",
      alteradas.length === 0,
      alteradas.length === 0
        ? "sin cambios de texto al construir"
        : `Piezas alteradas: ${alteradas.map((c) => c.pieza.slug).join(", ")}`,
    ),
  );

  const cortados = issues.filter((i) => i.issue.code === "posible-corte");
  checks.push(
    check(
      etiqueta("Ningún párrafo termina cortado a media frase"),
      "error",
      cortados.length === 0,
      cortados.length === 0
        ? "todos terminan en puntuación final"
        : cortados.map((i) => `${i.issue.id}: ${i.issue.message}`).join(" | "),
    ),
  );

  const sinColocar = [...imagenesPorSrc.keys()].filter((src) => {
    const rol = fuente.imagenes[src]?.rol;
    return rol !== undefined && rol !== "ignorar" && rol !== "titulo" && !usadas.has(src);
  });
  checks.push(
    check(
      etiqueta("Toda imagen del libro está colocada en una pieza"),
      "error",
      sinColocar.length === 0,
      sinColocar.length === 0
        ? `${usadas.size} imagen(es) colocada(s)`
        : `Sin colocar: ${sinColocar.join(", ")}`,
    ),
  );

  const titulosSinUso = [...imagenesPorSrc.keys()].filter(
    (src) => fuente.imagenes[src]?.rol === "titulo" && !portadillas.has(src),
  );
  if (titulosSinUso.length > 0)
    checks.push(
      check(
        etiqueta("Imágenes de título sin pieza"),
        "advertencia",
        false,
        `Ninguna pieza usa: ${titulosSinUso.join(", ")}`,
      ),
    );

  // --- Contraste con otras exportaciones ---
  for (const c of fuente.contrastes) {
    const otro = readEpub(resolve(base, c.archivo));
    const ruido: Warning[] = [];
    const palabrasOtro = palabrasDeParrafos(
      otro.docs
        .flatMap((doc) => extractAtoms(doc, ruido))
        .filter((a): a is ParaAtom => a.kind === "p"),
    );
    const esperado =
      c.piezas === undefined
        ? palabrasDeParrafos(stream.paragraphs)
        : cortes
            .filter((x) => c.piezas?.includes(x.def.slug))
            .flatMap((x) => palabrasDeBorradores(x.drafts));
    const hunks = compararPalabras(esperado, palabrasOtro, 6);
    const alcance =
      c.piezas === undefined ? "el documento completo" : `las piezas ${c.piezas.join(" + ")}`;
    checks.push(
      check(
        `Contraste: ${basename(c.archivo)} vs ${alcance} de ${nombre}`,
        "advertencia",
        hunks.length === 0,
        hunks.length === 0
          ? `Coincide palabra por palabra (${palabrasOtro.length} palabras)`
          : `Difiere en ${hunks.length}${hunks.length >= 6 ? "+" : ""} tramo(s) (A = ${nombre}, B = ${basename(c.archivo)}):\n` +
              hunks.map((h) => `    • ${describirHunk(h, esperado)}`).join("\n"),
      ),
    );
  }

  res.fuentes.push({ archivo: nombre, sha256: epub.sha256, titulo: epub.title });
  res.piezas.push(...piezas);
  res.checks.push(...checks);
  res.issues.push(...issues);
  res.warnings.push(...warnings);
  res.ignorados.push(...stream.ignored);
  res.imagenes.push(...imagenes);
}

export function manifestDe(res: Resultado): Manifest {
  return {
    version: 1,
    obra: res.mapeo.obra,
    pieces: res.piezas.map((p) => ({
      slug: p.slug,
      kind: p.kind,
      title: p.title,
      credit: p.credit,
      file: `${p.slug}.json`,
      stats: p.stats,
    })),
  };
}

/** Guarda piezas, manifiesto, assets e informe en `<carpeta del mapeo>/canonico`. Reemplaza lo anterior. */
export function escribirObra(res: Resultado, mapeoPath: string): string {
  const out = join(dirname(resolve(mapeoPath)), "canonico");
  if (basename(out) !== "canonico") throw new Error("Carpeta de salida inesperada");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "assets"), { recursive: true });
  for (const pieza of res.piezas)
    writeFileSync(join(out, `${pieza.slug}.json`), `${JSON.stringify(pieza, null, 2)}\n`);
  writeFileSync(join(out, "manifest.json"), `${JSON.stringify(manifestDe(res), null, 2)}\n`);
  for (const [name, data] of res.assets) writeFileSync(join(out, "assets", name), data);
  writeFileSync(join(out, "informe.md"), informeMarkdown(res));
  return out;
}

export function informeMarkdown(res: Resultado): string {
  const L: string[] = [];
  const sev = (c: Check) => (c.ok ? "✅" : c.nivel === "error" ? "❌" : "⚠️");
  L.push(`# Informe de importación — ${res.mapeo.obra}`, "");
  L.push(
    "> Generado por `scripts/ingesta`. No editar a mano: se reescribe en cada importación.",
    "",
  );
  for (const f of res.fuentes)
    L.push(`- **Fuente:** \`${f.archivo}\` (sha256 \`${f.sha256.slice(0, 16)}…\`)`);
  L.push(`- **Resultado:** ${res.ok ? "✅ sin errores" : "❌ con errores"}`, "");

  L.push(
    "## Piezas",
    "",
    "| Pieza | Tipo | Firma | Palabras | Párrafos | Lectura |",
    "|---|---|---|---:|---:|---:|",
  );
  for (const p of res.piezas) {
    L.push(
      `| ${p.title} (\`${p.slug}\`) | ${p.kind} | ${p.credit ?? "—"} | ${p.stats.words} | ${p.stats.paragraphs} | ${p.stats.minutes} min |`,
    );
  }

  L.push("", "## Verificación de integridad", "");
  for (const c of res.checks) L.push(`- ${sev(c)} **${c.nombre}** — ${c.detalle}`);

  const errors = res.issues.filter((i) => i.issue.level === "error");
  const warns = res.issues.filter(
    (i) => i.issue.level === "warning" && i.issue.code !== "posible-corte",
  );
  if (errors.length + warns.length > 0) {
    L.push("", "## Problemas de validación", "");
    for (const { slug, issue } of [...errors, ...warns])
      L.push(
        `- ${issue.level === "error" ? "❌" : "⚠️"} \`${slug}\` ${issue.id ?? ""} — ${issue.message}`,
      );
  }

  L.push(
    "",
    "## Imágenes",
    "",
    "| Fuente | Archivo | Rol | Pieza | Asset |",
    "|---|---|---|---|---|",
  );
  for (const i of res.imagenes)
    L.push(
      `| ${i.fuente} | \`${i.src}\` | ${i.rol} | ${i.pieza ?? "—"} | ${i.asset ? `\`${i.asset}\`` : "—"} |`,
    );

  if (res.ignorados.length > 0) {
    L.push("", "## Texto ignorado por el mapeo", "");
    for (const p of res.ignorados)
      L.push(
        `- "${p.text.slice(0, 90)}${p.text.length > 90 ? "…" : ""}" (${wordsOf(p.text).length} palabras)`,
      );
  }

  const unique = [...new Map(res.warnings.map((w) => [`${w.code}:${w.message}`, w])).values()];
  if (unique.length > 0) {
    L.push("", "## Avisos del importador", "");
    for (const w of unique) L.push(`- \`${w.code}\` ${w.message}`);
  }
  L.push("");
  return L.join("\n");
}
