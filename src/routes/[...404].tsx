import { A, useLocation } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { Show } from "solid-js";
import { SiteHeader } from "~/components/catalog/SiteHeader";
import { Seo } from "~/components/ui/Seo";

export default function NotFound() {
  // /404.html es el archivo que GitHub Pages sirve para rutas inexistentes: se genera con
  // estado 200 al prerenderizar (Pages ya responde 404 al servirlo). En servidor real, 404.
  const isStaticFallback = () => useLocation().pathname.endsWith("/404.html");
  return (
    <div class="min-h-screen">
      <Show when={!isStaticFallback()}>
        <HttpStatusCode code={404} />
      </Show>
      <Seo
        title="Página no encontrada · Huapango +reads"
        description="Esta página no existe."
        path="/404"
        noindex
      />
      <SiteHeader />
      <main class="mx-auto max-w-[1360px] px-4 py-24 text-center sm:px-10">
        <h1 class="font-serif text-4xl font-light sm:text-5xl">Esta página no existe</h1>
        <p class="mt-4 text-carbon-300">
          <A href="/" class="text-terregal-400">
            Volver al catálogo
          </A>
        </p>
      </main>
    </div>
  );
}
