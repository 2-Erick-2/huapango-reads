import { onMount } from "solid-js";
import { Reader } from "~/components/reader/Reader";
import { Seo } from "~/components/ui/Seo";
import { estadoCuenta, iniciarCuentaLector } from "~/lib/lector/cuenta";
import { demoPieza, DEMO_NOTICE } from "~/lib/reader/demo-pieza";

const today = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date());
const pieza = demoPieza();

/** Lector de demostración. Refleja cuenta o modo invitado en la marca de agua. */
export default function ReaderDemo() {
  onMount(() => iniciarCuentaLector());

  const watermark = () => {
    const cuenta = estadoCuenta();
    if (cuenta.modo === "sesion" && cuenta.lector) {
      return `${cuenta.lector.nombre} · ${cuenta.lector.correo} · ${today}`;
    }
    if (cuenta.modo === "invitado") {
      return `Modo invitado · Lectura de muestra · ${today}`;
    }
    return `Ejemplar de muestra · Huapango +reads · ${today}`;
  };

  return (
    <>
      <Seo
        title="Lector de demostración · Huapango +reads"
        description="Prueba el lector de Huapango +reads con un texto de demostración."
        path="/leer/demo"
        noindex
      />
      <Reader
        pieza={pieza}
        assetUrl={() => ""}
        watermark={watermark()}
        exitHref="/"
        notice={DEMO_NOTICE}
      />
    </>
  );
}
