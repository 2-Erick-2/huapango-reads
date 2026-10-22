/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen público, p. ej. https://2-erick-2.github.io (ver src/lib/site.ts) */
  readonly VITE_SITE_ORIGIN?: string;
  /** "true" para marcar todas las páginas con noindex (builds de demo) */
  readonly VITE_NOINDEX?: string;
}
