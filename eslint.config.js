// Configuração de lint: regras com tipos e fronteiras de camada (specs/v1/spec-outbox/arquitetura.md §11.3).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

const SUBIDA_PROIBIDA = {
  regex: "^\\.\\./\\.\\./",
  message: "Entre módulos, importe por subpath (#camada/...), não com ../../",
};

/** Fronteiras por camada: cada entrada proíbe o que a camada não pode importar. */
const FRONTEIRAS = {
  "src/dominio/**/*.ts": {
    regex: "^(?!(?:zod|#dominio/.+|\\.{1,2}/.+)$)",
    message:
      "O domínio só pode importar zod e #dominio/* (sem IO, sem node:*, sem outras camadas).",
  },
  "src/aplicacao/**/*.ts": {
    regex: "^(?!(?:zod|#dominio/.+|#aplicacao/.+|\\.{1,2}/.+)$)",
    message: "A aplicação só pode importar zod, #dominio/* e #aplicacao/*.",
  },
  "src/infra/**/*.ts": {
    regex: "^(?:#interfaces/|#composicao$)",
    message: "A infra não pode importar interfaces nem a composição.",
  },
  "src/interfaces/**/*.ts": {
    regex: "^#infra/",
    message: "As interfaces acessam a infra só pela composição (#composicao).",
  },
};

export default tseslint.config(
  {
    ignores: [
      "coverage/",
      "node_modules/",
      "tests/fixtures/",
      "dados/",
      "curriculo/",
      "specs/",
      ".claude/",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-exports": ["error", { restrictDefaultExports: { direct: true } }],
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true, requireDefaultForNonUnion: true },
      ],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-restricted-imports": ["error", { patterns: [SUBIDA_PROIBIDA] }],
    },
  },
  ...Object.entries(FRONTEIRAS).map(([arquivos, padrao]) => ({
    files: [arquivos],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [SUBIDA_PROIBIDA, padrao] }],
    },
  })),
  {
    files: ["**/*.test.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["eslint.config.js", "vitest.config.ts"],
    rules: { "no-restricted-exports": "off" },
  },
  {
    files: ["bin/**/*.js", "tests/fakes/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", setTimeout: "readonly" },
    },
  },
  prettier,
);
