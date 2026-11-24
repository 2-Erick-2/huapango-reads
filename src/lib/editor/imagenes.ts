/**
 * Validación binaria de imágenes PNG reales y cálculo de resolución para imprenta (editor del panel).
 * Sin dependencias del navegador para poder probarse directo en Vitest.
 */
import { slugify } from "~/lib/libro/paquete";
import type { ImageBlock } from "~/lib/libro/types";

export const PNG_MAX_BYTES = 15 * 1024 * 1024;
export const PPP_MINIMO_IMPRESION = 300;
export const ANCHO_CAJA_CLASICA_PT = 250;

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** Comprueba los primeros 8 bytes reales del archivo (evita archivos JPG/WebP renombrados a `.png`). */
export function esPngReal(bytes: Uint8Array): boolean {
  if (bytes.length < FIRMA_PNG.length) return false;
  return FIRMA_PNG.every((b, i) => bytes[i] === b);
}

/** Valida la firma PNG y lee sus medidas desde la cabecera IHDR. Devuelve null si no es PNG válido. */
export function leerPng(bytes: Uint8Array): { ancho: number; alto: number } | null {
  if (bytes.length < 24 || !esPngReal(bytes)) return null;
  // Primer bloque obligatorio en un PNG: IHDR (bytes 12..15)
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52)
    return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ancho = view.getUint32(16, false);
  const alto = view.getUint32(20, false);
  if (ancho <= 0 || alto <= 0) return null;
  return { ancho, alto };
}

/** Resolución efectiva (ppp) al imprimir en la caja media carta según el papel y ancho elegido. */
export function calcularPppImpresion(
  anchoPx: number,
  role: ImageBlock["role"],
  widthPct: number | null,
  anchoCajaPt = ANCHO_CAJA_CLASICA_PT,
): number {
  const fraccion = role === "portadilla" ? 1 : Math.min(1, Math.max(0.05, (widthPct ?? 100) / 100));
  const wPt = anchoCajaPt * fraccion;
  return Math.round(anchoPx / (wPt / 72));
}

/** Nombre limpio y único terminado en `.png` para guardar en el almacenamiento de la editorial. */
export function nombreAssetPng(nombreOriginal: string, sufijo: string): string {
  const sinExt = nombreOriginal.replace(/\.[^.]+$/, "");
  const base = slugify(sinExt).slice(0, 40) || "imagen";
  const cleanSufijo = slugify(sufijo) || "1";
  return `${base}-${cleanSufijo}.png`;
}
