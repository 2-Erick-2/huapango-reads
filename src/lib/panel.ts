/**
 * El panel de la editorial todavía NO tiene cuentas ni permisos (llegan con Supabase en el Hito 2),
 * así que solo se enciende en desarrollo o si se compila con `VITE_PANEL=true`. El build público
 * (GitHub Pages, producción) nunca lo incluye en funcionamiento: sus rutas responden 404.
 */
export const PANEL_ENABLED: boolean =
  import.meta.env.DEV || import.meta.env["VITE_PANEL"] === "true";
