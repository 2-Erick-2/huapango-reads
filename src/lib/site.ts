/**
 * Configuración del sitio según el entorno de build (ADR 0009):
 * - Producción (planeada): https://reads.editorialhuapango.com.mx, base "/".
 * - Demo en GitHub Pages: https://2-erick-2.github.io + base "/huapango-reads", sin indexar.
 */

/** Subruta donde vive la app, sin "/" final ("" en raíz, "/huapango-reads" en GitHub Pages) */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Origen público (sin ruta). Se define con VITE_SITE_ORIGIN al compilar. */
export const SITE_ORIGIN = (
  import.meta.env.VITE_SITE_ORIGIN ?? "https://reads.editorialhuapango.com.mx"
).replace(/\/$/, "");

/** true en builds de demo: todas las páginas llevan noindex */
export const NOINDEX = import.meta.env.VITE_NOINDEX === "true";

export const SITE_NAME = "Huapango +reads";
export const PUBLISHER_URL = "https://www.editorialhuapango.com.mx";

/** Ruta a un archivo de /public respetando la subruta: asset("/books/x.webp") */
export const asset = (path: string) => `${BASE_PATH}${path}`;

/** URL absoluta de una ruta de la app: absoluteUrl("/libro/nahual") */
export const absoluteUrl = (routePath: string) => `${SITE_ORIGIN}${BASE_PATH}${routePath}`;

/** URL absoluta de una ruta que ya incluye la subruta (p. ej. las de asset()) */
export const originUrl = (prefixedPath: string) => `${SITE_ORIGIN}${prefixedPath}`;
