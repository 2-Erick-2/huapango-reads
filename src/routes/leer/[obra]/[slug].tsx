import { useParams } from "@solidjs/router";
import { ObraReader } from "~/components/reader/ObraReader";

/** /leer/<obra>/<pieza>: abre un complemento (prólogo, nota, epílogo…) o el libro por su slug. */
export default function PiezaPage() {
  const params = useParams();
  return <ObraReader obra={params.obra ?? ""} slug={params.slug ?? ""} />;
}
