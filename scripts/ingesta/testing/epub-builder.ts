/**
 * Utilidades SOLO para pruebas: arman ZIP y EPUB sintéticos en memoria, para probar el importador
 * (incluidos los casos de error) sin depender de archivos de la editorial.
 */
import { crc32, deflateRawSync } from "node:zlib";

export interface ZipFile {
  name: string;
  data: Buffer | string;
  method?: 0 | 8;
  /** Sobrescribe el campo de banderas (p. ej. 1 = cifrado) */
  flags?: number;
  /** Sobrescribe el CRC para simular un archivo dañado */
  crc?: number;
}

export function buildZip(files: ZipFile[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const raw = typeof file.data === "string" ? Buffer.from(file.data, "utf8") : file.data;
    const method = file.method ?? 8;
    const body = method === 0 ? raw : deflateRawSync(raw);
    const crc = file.crc ?? crc32(raw);
    const flags = file.flags ?? 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + body.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

/** PNG de 1×1 píxel válido. */
export const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export interface EpubSpec {
  /** Cuerpo del XHTML (lo que va dentro de <body>) */
  body: string;
  css?: string;
  /** Imágenes extra: ruta relativa a OEBPS -> bytes */
  images?: Record<string, Buffer>;
  title?: string;
}

/** Arma un EPUB mínimo de un solo documento. */
export function buildEpub(spec: EpubSpec): Buffer {
  const css = spec.css ?? "";
  const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es">
<head><title>t</title><link rel="stylesheet" type="text/css" href="css/estilos.css"/></head>
<body>${spec.body}</body>
</html>`;
  const images = spec.images ?? {};
  const imageItems = Object.keys(images)
    .map((p, i) => `<item id="img${i}" href="${p}" media-type="image/png"/>`)
    .join("");
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${spec.title ?? "Prueba"}</dc:title><dc:language>es</dc:language><dc:identifier id="id">urn:uuid:test</dc:identifier></metadata>
<manifest><item id="c" href="contenido.xhtml" media-type="application/xhtml+xml"/><item id="css" href="css/estilos.css" media-type="text/css"/>${imageItems}</manifest>
<spine><itemref idref="c"/></spine>
</package>`;
  const container = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;

  return buildZip([
    { name: "mimetype", data: "application/epub+zip", method: 0 },
    { name: "META-INF/container.xml", data: container },
    { name: "OEBPS/content.opf", data: opf },
    { name: "OEBPS/contenido.xhtml", data: xhtml },
    { name: "OEBPS/css/estilos.css", data: css },
    ...Object.entries(images).map(([path, data]) => ({ name: `OEBPS/${path}`, data })),
  ]);
}
