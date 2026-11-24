/**
 * Prueba del PDF de imprenta contra un servidor real (local o Render): entra como Edición y genera
 * media carta y folleto de los dos libros. Uso:
 *   BASE_URL=https://huapango-reads.onrender.com HR_PIN_EDITOR=… npm run e2e:imprenta
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";

const BASE = process.env["BASE_URL"] ?? "http://localhost:4300";
const SALIDA = `${process.env["TEMP"] ?? "/tmp"}/hr-imprenta`;
mkdirSync(SALIDA, { recursive: true });
let fallas = 0;
const sb = createClient(
  "https://apxhxjmdrudgrxifmqgs.supabase.co",
  "sb_publishable_Qj95z0YCsRjWNb5QFKQkgA_musrhVnh",
  {
    auth: { persistSession: false },
  },
);
const { data, error } = await sb.auth.signInWithPassword({
  email: "erick@panel.huapango.invalid",
  password: process.env["HR_PIN_EDITOR"] ?? "",
});
if (error || !data.session) throw new Error(`No pude entrar: ${error?.message}`);
const token = data.session.access_token;

for (const [obra, titulo, autor] of [
  ["el-principe-feliz", "El príncipe feliz", "Oscar Wilde"],
  ["nahual", "Nahual", "Luis Armando Rosado"],
] as const) {
  for (const formato of ["media-carta", "folleto"] as const) {
    const t0 = Date.now();
    const r = await fetch(`${BASE}/api/panel/imprimir`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        obraSlug: obra,
        origen: "demo",
        titulo,
        autor,
        legal: `${titulo}\n${autor}\n\n© 2026 Editorial Huapango`,
        colofon: "Impreso en Editorial Huapango.",
        formato,
        multiploDe4: true,
        guardarEnNube: false,
      }),
    });
    const j = (await r.json()) as {
      pdfBase64?: string;
      paginas?: number;
      hojas?: number;
      avisos?: unknown[];
      error?: string;
      nombreArchivo?: string;
    };
    if (!r.ok || !j.pdfBase64) {
      console.log(`FALLA ${obra} ${formato}: HTTP ${r.status} ${j.error ?? ""}`);
      fallas += 1;
      continue;
    }
    const bytes = Buffer.from(j.pdfBase64, "base64");
    const doc = await PDFDocument.load(bytes);
    const p = doc.getPage(0).getSize();
    writeFileSync(`${SALIDA}/${j.nombreArchivo}`, bytes);
    console.log(
      `OK ${obra} ${formato}: ${doc.getPageCount()} págs de ${(p.width / 72).toFixed(1)}×${(p.height / 72).toFixed(1)} in, libro de ${j.paginas} págs, ${j.hojas} hojas, ${(j.avisos ?? []).length} avisos de imagen, ${((Date.now() - t0) / 1000).toFixed(1)} s`,
    );
  }
}

console.log(fallas === 0 ? "PDF de imprenta: todo OK" : `${fallas} falla(s)`);
process.exitCode = fallas === 0 ? 0 : 1;
