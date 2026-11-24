/** Medidas en píxeles de una imagen (PNG, JPEG, GIF o WebP), con el lector del importador. */
import { imageInfo } from "../../../scripts/ingesta/imagen.ts";
import type { InfoImagen } from "./libro";

export function infoDeImagen(datos: Uint8Array, nombre = "imagen"): InfoImagen {
  const info = imageInfo(Buffer.from(datos), nombre);
  return { ancho: info.width, alto: info.height };
}
