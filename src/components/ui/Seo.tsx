import { Link, Meta, Title } from "@solidjs/meta";
import { Show } from "solid-js";
import { absoluteUrl, asset, NOINDEX, originUrl, SITE_NAME } from "~/lib/site";

/** Metadatos SEO por página: título, descripción, canonical, Open Graph, Twitter y JSON-LD. */
export function Seo(props: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "book";
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
}) {
  const url = () => absoluteUrl(props.path);
  const image = () => originUrl(props.image ?? asset("/brand/logo-huapango-claro.svg"));
  return (
    <>
      <Title>{props.title}</Title>
      <Meta name="description" content={props.description} />
      <Show when={props.noindex || NOINDEX}>
        <Meta name="robots" content="noindex" />
      </Show>
      <Link rel="canonical" href={url()} />
      <Meta property="og:site_name" content={SITE_NAME} />
      <Meta property="og:locale" content="es_MX" />
      <Meta property="og:type" content={props.type ?? "website"} />
      <Meta property="og:title" content={props.title} />
      <Meta property="og:description" content={props.description} />
      <Meta property="og:url" content={url()} />
      <Meta property="og:image" content={image()} />
      <Meta name="twitter:card" content="summary_large_image" />
      <Show when={props.jsonLd}>
        {(data) => <script type="application/ld+json">{JSON.stringify(data())}</script>}
      </Show>
    </>
  );
}
