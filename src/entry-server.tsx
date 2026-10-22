// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { asset } from "./lib/site";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="es-MX">
        <head>
          <meta charset="utf-8" />
          {/* Sin user-scalable=no: el zoom es un requisito de accesibilidad */}
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#141413" />
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
