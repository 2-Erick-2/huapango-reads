// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

const root = document.getElementById("app");
if (!root) throw new Error("No se encontró el contenedor #app");
mount(() => <StartClient />, root);
