// Lint do site: mesmas regras com tipos do agente, mais JSX. Usa os pacotes de lint da raiz (workspace).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "no-restricted-exports": ["error", { restrictDefaultExports: { direct: true } }],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(\\.\\./)+.*src/",
              message:
                "O contrato do agente vem por @contrato; o resto do repositório não entra no site.",
            },
            {
              regex: "^#(infra|aplicacao|interfaces|composicao)",
              message: "O site só vê @contrato.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "src/testes/**", "tests/**"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
  {
    files: ["eslint.config.js", "vite.config.ts"],
    rules: { "no-restricted-exports": "off" },
  },
  { files: ["**/*.js"], ...tseslint.configs.disableTypeChecked },
  prettier,
);
