import { Reader } from "~/components/reader/Reader";
import { Seo } from "~/components/ui/Seo";
import { DEMO_TEXT } from "~/lib/reader/demo-text";

const today = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date());

/** Lector de demostración (Hito 1). Sin login: marca de agua con datos de muestra. */
export default function ReaderDemo() {
  return (
    <>
      <Seo
        title="Lector de demostración · Huapango +reads"
        description="Prueba el lector de Huapango +reads con un texto de demostración."
        path="/leer/demo"
        noindex
      />
      <Reader
        text={DEMO_TEXT}
        watermark={`Ejemplar de muestra · lector@ejemplo.com · ${today} · ID HR-DEMO`}
        exitHref="/"
      />
    </>
  );
}
