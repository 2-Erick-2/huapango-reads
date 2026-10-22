import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { BASE_PATH } from "./lib/site";
import "./styles/app.css";

export default function App() {
  return (
    <Router
      base={BASE_PATH}
      root={(props) => (
        <MetaProvider>
          <Title>Huapango +reads</Title>
          <Suspense>{props.children}</Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
