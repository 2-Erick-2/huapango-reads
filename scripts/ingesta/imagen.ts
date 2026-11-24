/** Medidas y tipo de una imagen leyendo solo su encabezado (PNG y JPEG), sin dependencias. */

export interface ImageInfo {
  width: number;
  height: number;
  ext: "png" | "jpg";
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function imageInfo(data: Buffer, name: string): ImageInfo {
  if (data.length > 24 && data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    if (width > 0 && height > 0) return { width, height, ext: "png" };
    throw new Error(`PNG sin medidas: ${name}`);
  }
  if (data.length > 4 && data[0] === 0xff && data[1] === 0xd8) return jpegInfo(data, name);
  throw new Error(`Formato de imagen no soportado (solo PNG y JPEG): ${name}`);
}

function jpegInfo(data: Buffer, name: string): ImageInfo {
  let i = 2;
  while (i + 9 < data.length) {
    if (data[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = data[i + 1];
    if (marker === undefined) break;
    if (marker === 0xff) {
      i++;
      continue;
    }
    // Marcadores sin longitud
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = data.readUInt16BE(i + 2);
    // SOF0..SOF15, salvo DHT (C4), JPG (C8) y DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = data.readUInt16BE(i + 5);
      const width = data.readUInt16BE(i + 7);
      if (width > 0 && height > 0) return { width, height, ext: "jpg" };
      break;
    }
    i += 2 + length;
  }
  throw new Error(`No se pudieron leer las medidas del JPEG: ${name}`);
}
