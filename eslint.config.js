import js from "@eslint/js";
import tseslint from "typescript-eslint";
import solid from "eslint-plugin-solid/configs/typescript";
import globals from "globals";

export default tseslint.config(
  { ignores: [".output", ".vinxi", ".nitro", "dist", "node_modules", ".vercel"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.{ts,tsx}"],
    ...solid,
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // Solid asigna las refs (`let el!: HTMLDivElement` + `ref={el}`) en tiempo de compilación;
      // esta regla de ESLint 10 no lo entiende y da falsos positivos.
      "no-unassigned-vars": "off",
    },
  },
);
