// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { asset } from "./lib/site";
import { COLOR_BARRA, SCRIPT_TEMA } from "./lib/tema";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="es-MX">
        <head>
          <meta charset="utf-8" />
          {/* Sin user-scalable=no: el zoom es un requisito de accesibilidad */}
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta
            name="theme-color"
            media="(prefers-color-scheme: light)"
            content={COLOR_BARRA.dia}
          />
          <meta
            name="theme-color"
            media="(prefers-color-scheme: dark)"
            content={COLOR_BARRA.noche}
          />
          {/* Aplica el modo elegido antes de pintar (sin parpadeo). Ver src/lib/tema.ts */}
          <script innerHTML={SCRIPT_TEMA} />
          <link rel="icon" type="image/svg+xml" href={asset("/favicon.svg")} />
          <link rel="icon" type="image/png" sizes="32x32" href={asset("/favicon-32.png")} />
          <link rel="apple-touch-icon" href={asset("/apple-touch-icon.png")} />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
