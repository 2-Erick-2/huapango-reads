/**
 * Modo día / noche (ADR 0022).
 * - Por omisión sigue al dispositivo (claro → día, oscuro → noche).
 * - El botón sol/luna alterna. Si lo elegido coincide con el dispositivo, se vuelve a "automático"
 *   (no se guarda nada); si no, se recuerda en este navegador.
 * - `SCRIPT_TEMA` corre en <head> antes de pintar, para que no haya un parpadeo de un modo al otro.
 */
export type Tema = "dia" | "noche";

export const CLAVE_TEMA = "hr:tema";
/** Color de la barra del navegador en el teléfono, por modo */
export const COLOR_BARRA: Readonly<Record<Tema, string>> = { dia: "#fdfbf7", noche: "#141413" };

/** Script en línea para <head>. Pequeño, sin dependencias y a prueba de almacenamiento bloqueado. */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CLAVE_TEMA}");if(t==="dia"||t==="noche"){document.documentElement.setAttribute("data-tema",t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){m[i].setAttribute("content",t==="dia"?"${COLOR_BARRA.dia}":"${COLOR_BARRA.noche}");m[i].removeAttribute("media");}}}catch(e){}})();`;

const esTema = (v: unknown): v is Tema => v === "dia" || v === "noche";

export function temaDelSistema(): Tema {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "dia" : "noche";
  } catch {
    return "noche";
  }
}

/** El modo que eligió la persona con el botón, o null si está en automático. */
export function temaElegido(): Tema | null {
  try {
    const t = localStorage.getItem(CLAVE_TEMA);
    return esTema(t) ? t : null;
  } catch {
    return null;
  }
}

/** El modo que se ve ahora. */
export function temaActual(): Tema {
  return temaElegido() ?? temaDelSistema();
}

function pintarBarra(tema: Tema | null) {
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    if (tema) {
      meta.setAttribute("content", COLOR_BARRA[tema]);
      meta.removeAttribute("media");
    }
  }
}

/** Fija un modo (o null = automático). */
export function aplicarTema(tema: Tema | null): void {
  const raiz = document.documentElement;
  try {
    if (tema) localStorage.setItem(CLAVE_TEMA, tema);
    else localStorage.removeItem(CLAVE_TEMA);
  } catch {
    // sin almacenamiento: el modo se aplica solo a esta visita
  }
  if (tema) raiz.setAttribute("data-tema", tema);
  else raiz.removeAttribute("data-tema");
  pintarBarra(tema ?? temaDelSistema());
}

/**
 * Cambia al otro modo. Si el nuevo coincide con el del dispositivo, vuelve a automático.
 * Devuelve el modo que queda.
 */
export function alternarTema(): Tema {
  const nuevo: Tema = temaActual() === "dia" ? "noche" : "dia";
  aplicarTema(nuevo === temaDelSistema() ? null : nuevo);
  return nuevo;
}

/** Decide el siguiente estado sin tocar el navegador (para probarlo). */
export function siguienteTema(actual: Tema, sistema: Tema): { tema: Tema; guardar: Tema | null } {
  const tema: Tema = actual === "dia" ? "noche" : "dia";
  return { tema, guardar: tema === sistema ? null : tema };
}
