import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/apoio/setup.ts"],
    retry: 0,
    // Vários arquivos lançam Chromium e processos filhos: metade dos núcleos evita disputa de memória
    // e CPU que fazia navegações locais passarem de 15 s.
    maxWorkers: "50%",
    testTimeout: 30000,
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: {
        lines: 70,
        statements: 70,
        "src/dominio/**": { lines: 90, branches: 90 },
        "src/aplicacao/**": { lines: 80, branches: 80 },
      },
    },
  },
});
