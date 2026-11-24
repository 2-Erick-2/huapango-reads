/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen público, p. ej. https://2-erick-2.github.io (ver src/lib/site.ts) */
  readonly VITE_SITE_ORIGIN?: string;
  /** "true" para marcar todas las páginas con noindex (builds de demo) */
  readonly VITE_NOINDEX?: string;
  /** "true" enciende el panel de la editorial en un build (ver src/lib/panel.ts) */
  readonly VITE_PANEL?: string;
  /** Proyecto de Supabase (ADR 0020). La llave publicable está hecha para el navegador. */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
