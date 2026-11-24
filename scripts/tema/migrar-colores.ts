/**
 * Migración única (ADR 0022): cambia las clases de color crudas (paleta) por colores con significado
 * que funcionan en modo día y noche. Se deja en el repo como registro de la tabla usada.
 *
 *   node scripts/tema/migrar-colores.ts            # aplica en src/**\/*.tsx
 *   node scripts/tema/migrar-colores.ts --revisar  # solo cuenta, no escribe
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Tipo = "bg" | "text" | "border" | "divide" | "placeholder";

/** Tabla de equivalencias por tipo de utilidad: color de paleta -> color con significado. */
export const TABLA: Record<Tipo, Record<string, string>> = {
  bg: {
    "carbon-950": "fondo-hondo",
    "carbon-900": "fondo",
    "carbon-850": "superficie",
    "carbon-800": "superficie-2",
    "carbon-700": "control",
    "carbon-600": "control-fuerte",
    "terregal-600": "acento-fondo",
    "terregal-700": "acento-fondo-hover",
    "terregal-500": "acento-vivo",
    "terregal-400": "acento-vivo",
    "terregal-900": "acento-tenue",
  },
  text: {
    "bond-100": "tinta",
    "bond-300": "tinta-2",
    "carbon-200": "tinta-2",
    "carbon-300": "tinta-suave",
    "carbon-400": "tinta-tenue",
    "carbon-500": "tinta-tenue",
    "terregal-400": "acento",
    "terregal-500": "acento",
    "terregal-600": "acento",
    "ochre-300": "aviso",
  },
  border: {
    "carbon-900": "fondo",
    "carbon-800": "linea",
    "carbon-700": "linea-fuerte",
    "carbon-600": "borde",
    "carbon-500": "borde-hover",
    "carbon-400": "borde-hover",
    "terregal-500": "acento-borde",
    "terregal-700": "error",
    "terregal-800": "acento-tenue-borde",
    "ochre-600": "aviso-borde",
    "bond-100": "fondo",
    "bond-300": "tinta-2",
  },
  divide: { "carbon-800": "linea", "carbon-700": "linea-fuerte" },
  placeholder: { "carbon-500": "tinta-tenue", "carbon-400": "tinta-tenue" },
};

const CLASE =
  /(?<=^|[\s"'`{(:])(bg|text|border|divide|placeholder)-((?:carbon|bond|terregal|ochre)-\d{2,3})(?=[\s"'`/})]|$)/gm;

export function migrar(codigo: string): { codigo: string; cambios: number } {
  let cambios = 0;
  const nuevo = codigo.replace(CLASE, (todo, tipo: Tipo, color: string) => {
    const destino = TABLA[tipo][color];
    if (!destino) return todo;
    cambios += 1;
    return `${tipo}-${destino}`;
  });
  return { codigo: nuevo, cambios };
}

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return ruta.endsWith(".tsx") ? [ruta] : [];
  });
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  const revisar = process.argv.includes("--revisar");
  let total = 0;
  for (const ruta of archivos("src")) {
    const antes = readFileSync(ruta, "utf8");
    const { codigo, cambios } = migrar(antes);
    if (cambios === 0) continue;
    total += cambios;
    console.log(`${String(cambios).padStart(4)}  ${ruta}`);
    if (!revisar) writeFileSync(ruta, codigo);
  }
  console.log(`\n${total} clases ${revisar ? "por cambiar" : "cambiadas"}.`);
}
