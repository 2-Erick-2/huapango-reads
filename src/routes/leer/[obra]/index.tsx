import { useParams } from "@solidjs/router";
import { ObraReader } from "~/components/reader/ObraReader";

/** /leer/<obra>: abre la pieza principal (el libro). */
export default function ObraPage() {
  const params = useParams();
  return <ObraReader obra={params.obra ?? ""} />;
}
