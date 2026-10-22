/** URL pública de +reads (subdominio de la editorial). Usada en canonical, Open Graph y JSON-LD. */
export const SITE_URL = "https://reads.editorialhuapango.com.mx";
export const SITE_NAME = "Huapango +reads";
export const PUBLISHER_URL = "https://www.editorialhuapango.com.mx";

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();
