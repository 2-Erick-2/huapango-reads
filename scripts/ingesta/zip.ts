/**
 * Lector mínimo de ZIP para EPUB. Sin dependencias: solo `node:zlib`.
 *
 * Los archivos de la editorial son entrada no confiable, así que aquí se rechaza todo lo dudoso
 * en vez de tolerarlo: rutas con `..`, nombres repetidos, cifrado, ZIP64, tamaños desmedidos
 * (bombas de descompresión) y datos cuyo CRC no coincide.
 */
import { crc32, inflateRawSync } from "node:zlib";

export interface ZipLimits {
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalBytes: number;
}

export const DEFAULT_LIMITS: ZipLimits = {
  maxEntries: 5_000,
  maxEntryBytes: 64 * 1024 * 1024,
  maxTotalBytes: 512 * 1024 * 1024,
};

export interface ZipEntry {
  name: string;
  /** Tamaño descomprimido declarado */
  size: number;
  /** Descomprime y verifica el CRC. Lanza si algo no cuadra. */
  read(): Buffer;
}

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

export function openZip(data: Buffer, limits: ZipLimits = DEFAULT_LIMITS): Map<string, ZipEntry> {
  const eocd = findEndOfCentralDirectory(data);
  const total = data.readUInt16LE(eocd + 10);
  const centralOffset = data.readUInt32LE(eocd + 16);
  if (total === 0xffff || centralOffset === 0xffffffff) throw new Error("ZIP64 no soportado");
  if (total > limits.maxEntries)
    throw new Error(`El ZIP trae ${total} entradas (máximo ${limits.maxEntries})`);

  const entries = new Map<string, ZipEntry>();
  let cursor = centralOffset;
  let declaredTotal = 0;

  for (let i = 0; i < total; i++) {
    if (cursor + 46 > data.length || data.readUInt32LE(cursor) !== SIG_CENTRAL)
      throw new Error("Directorio central del ZIP dañado");
    const flags = data.readUInt16LE(cursor + 8);
    const method = data.readUInt16LE(cursor + 10);
    const crc = data.readUInt32LE(cursor + 16);
    const compressedSize = data.readUInt32LE(cursor + 20);
    const size = data.readUInt32LE(cursor + 24);
    const nameLength = data.readUInt16LE(cursor + 28);
    const extraLength = data.readUInt16LE(cursor + 30);
    const commentLength = data.readUInt16LE(cursor + 32);
    const localOffset = data.readUInt32LE(cursor + 42);
    const name = data.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    cursor += 46 + nameLength + extraLength + commentLength;

    if (flags & 0x1) throw new Error(`Entrada cifrada: ${name}`);
    if (method !== 0 && method !== 8)
      throw new Error(`Compresión no soportada (${method}): ${name}`);
    if (name.endsWith("/")) continue; // carpeta
    assertSafeName(name);
    if (entries.has(name)) throw new Error(`Entrada repetida en el ZIP: ${name}`);
    if (size > limits.maxEntryBytes)
      throw new Error(`Entrada demasiado grande: ${name} (${size} bytes)`);
    declaredTotal += size;
    if (declaredTotal > limits.maxTotalBytes)
      throw new Error("El ZIP descomprimido excede el límite total");

    entries.set(name, {
      name,
      size,
      read: () => readEntry(data, name, localOffset, method, compressedSize, size, crc),
    });
  }
  return entries;
}

function findEndOfCentralDirectory(data: Buffer): number {
  const earliest = Math.max(0, data.length - 22 - 0xffff);
  for (let i = data.length - 22; i >= earliest; i--) {
    if (data.readUInt32LE(i) === SIG_EOCD) return i;
  }
  throw new Error("No es un ZIP válido (no se encontró el directorio central)");
}

function assertSafeName(name: string): void {
  if (
    name === "" ||
    name.startsWith("/") ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.split("/").some((part) => part === "..")
  ) {
    throw new Error(`Ruta insegura en el ZIP: ${JSON.stringify(name)}`);
  }
}

function readEntry(
  data: Buffer,
  name: string,
  localOffset: number,
  method: number,
  compressedSize: number,
  size: number,
  expectedCrc: number,
): Buffer {
  if (localOffset + 30 > data.length || data.readUInt32LE(localOffset) !== SIG_LOCAL)
    throw new Error(`Encabezado local dañado: ${name}`);
  const nameLength = data.readUInt16LE(localOffset + 26);
  const extraLength = data.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + nameLength + extraLength;
  const end = start + compressedSize;
  if (end > data.length) throw new Error(`Datos truncados: ${name}`);
  const raw = data.subarray(start, end);
  const out = method === 0 ? raw : inflateRawSync(raw, { maxOutputLength: size + 1 });
  if (out.length !== size) throw new Error(`Tamaño inesperado al descomprimir ${name}`);
  if (crc32(out) !== expectedCrc)
    throw new Error(`CRC incorrecto en ${name}: el archivo está dañado`);
  return out;
}
