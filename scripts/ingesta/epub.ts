/**
 * Lectura de un EPUB: paquete (OPF), documentos de lectura en orden (spine) y sus hojas de estilo.
 * No interpreta el contenido; eso es de `atoms.ts`.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseCss, type StyleSheet } from "./css.ts";
import { openZip, type ZipEntry } from "./zip.ts";
import {
  attr,
  elementChildren,
  findAll,
  findFirst,
  parseXml,
  textContent,
  type XElement,
} from "./xml.ts";

export interface EpubDoc {
  /** Ruta dentro del ZIP, p. ej. "OEBPS/capitulo1.xhtml" */
  href: string;
  /** XHTML tal como viene en el archivo (lo usa el verificador por un camino independiente) */
  raw: string;
  root: XElement;
  sheet: StyleSheet;
}

export interface EpubPackage {
  file: string;
  sha256: string;
  title: string | null;
  language: string | null;
  docs: EpubDoc[];
  /** Lee un recurso (imagen) referenciado desde un documento, con su `src` relativo. */
  readResource(fromDoc: string, src: string): { path: string; data: Buffer };
}

export function readEpub(file: string): EpubPackage {
  const data = readFileSync(file);
  const sha256 = createHash("sha256").update(data).digest("hex");
  const zip = openZip(data);

  const need = (name: string): ZipEntry => {
    const entry = zip.get(name);
    if (!entry) throw new Error(`${file}: falta ${name}`);
    return entry;
  };
  const readText = (name: string) => need(name).read().toString("utf8");

  const container = parseXml(readText("META-INF/container.xml"), "container.xml");
  const rootfile = findAll(container, "rootfile")[0];
  const opfPath = rootfile ? attr(rootfile, "full-path") : null;
  if (!opfPath) throw new Error(`${file}: container.xml no declara el paquete OPF`);

  const opf = parseXml(readText(opfPath), opfPath);
  const manifest = new Map<string, { href: string; type: string; properties: string }>();
  const manifestEl = findFirst(opf, "manifest");
  for (const item of manifestEl ? elementChildren(manifestEl) : []) {
    const id = attr(item, "id");
    const href = attr(item, "href");
    if (id && href) {
      manifest.set(id, {
        href: resolvePath(opfPath, href),
        type: attr(item, "media-type") ?? "",
        properties: attr(item, "properties") ?? "",
      });
    }
  }

  const docs: EpubDoc[] = [];
  const spine = findFirst(opf, "spine");
  for (const ref of spine ? elementChildren(spine) : []) {
    if (attr(ref, "linear") === "no") continue;
    const item = manifest.get(attr(ref, "idref") ?? "");
    if (
      !item ||
      item.type !== "application/xhtml+xml" ||
      item.properties.split(/\s+/).includes("nav")
    )
      continue;
    const raw = readText(item.href);
    const root = parseXml(raw, item.href);
    docs.push({ href: item.href, raw, root, sheet: collectStyles(root, item.href, readText) });
  }
  if (docs.length === 0) throw new Error(`${file}: el EPUB no tiene documentos de lectura`);

  const title = findFirst(opf, "dc:title");
  const language = findFirst(opf, "dc:language");
  return {
    file,
    sha256,
    title: title ? textContent(title).trim() : null,
    language: language ? textContent(language).trim() : null,
    docs,
    readResource(fromDoc, src) {
      const path = resolvePath(fromDoc, src);
      return { path, data: need(path).read() };
    },
  };
}

function collectStyles(
  root: XElement,
  docPath: string,
  readText: (name: string) => string,
): StyleSheet {
  const combined: StyleSheet = { rules: [], unsupported: [] };
  const append = (css: string) => {
    const parsed = parseCss(css);
    const offset = combined.rules.length;
    for (const rule of parsed.rules) combined.rules.push({ ...rule, order: rule.order + offset });
    combined.unsupported.push(...parsed.unsupported);
  };
  const head = findFirst(root, "head");
  for (const el of head ? elementChildren(head) : []) {
    if (el.name === "link" && attr(el, "rel")?.toLowerCase() === "stylesheet") {
      const href = attr(el, "href");
      if (href) append(readText(resolvePath(docPath, href)));
    } else if (el.name === "style") {
      append(textContent(el));
    }
  }
  return combined;
}

/** Resuelve `href` relativo a un archivo del ZIP. Lanza si intenta salirse de la raíz. */
export function resolvePath(fromFile: string, href: string): string {
  const clean = decodeURIComponent(href.split("#")[0]?.split("?")[0] ?? "");
  const base = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/") + 1) : "";
  const parts: string[] = [];
  for (const part of (clean.startsWith("/") ? clean.slice(1) : base + clean).split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) throw new Error(`Ruta fuera del paquete: ${href}`);
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}
