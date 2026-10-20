// Site estático do Camaleão (ADR-0024). O contrato da API vem direto do agente, sem cópia: o build
// falha se ele (ou o que ele importa) puxar algo além de `zod` e `#dominio/*`.
import { fileURLToPath } from "node:url";
import { relative, sep } from "node:path";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const RAIZ_REPO = fileURLToPath(new URL("../../", import.meta.url));
const CONTRATO = fileURLToPath(new URL("../../src/interfaces/http/contrato.ts", import.meta.url));
const PERMITIDOS_FORA_DO_SITE = [
  `src${sep}dominio${sep}`,
  `src${sep}interfaces${sep}http${sep}contrato.ts`,
  `node_modules${sep}zod${sep}`,
];

/** Só o contrato, o domínio e o zod podem vir de fora de `apps/web`. */
function fronteiraDoContrato(): Plugin {
  return {
    name: "camaleao:fronteira-do-contrato",
    enforce: "pre",
    async resolveId(origem, importador, opcoes) {
      if (!importador || importador.startsWith("\0")) return null;
      const doRepo = relative(RAIZ_REPO, importador.split("?")[0] ?? "");
      const doSite = [`apps${sep}`, `node_modules${sep}`, ".."].some((p) => doRepo.startsWith(p));
      if (doSite) return null;
      const resolvido = await this.resolve(origem, importador, { ...opcoes, skipSelf: true });
      if (!resolvido) return null;
      const alvo = relative(RAIZ_REPO, resolvido.id.split("?")[0] ?? "");
      if (!PERMITIDOS_FORA_DO_SITE.some((p) => alvo.startsWith(p))) {
        this.error(`o contrato só pode importar zod e #dominio/*, mas ${doRepo} importa ${origem}`);
      }
      return resolvido;
    },
  };
}

export default defineConfig({
  plugins: [react(), fronteiraDoContrato()],
  resolve: { alias: { "@contrato": CONTRATO } },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { sourcemap: false, assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/testes/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    restoreMocks: true,
  },
});
