import type { DefinicaoConector } from "#infra/conectores/base/conector-formulario.ts";
import { comSufixo } from "#infra/conectores/base/util.ts";

/**
 * Workable (apply.workable.com). Estrutura observada em 2026-10-10: formulário em /apply/, campos com
 * id/name, perguntas sim/não como radios por `name`, anexo com id aleatório e banner de cookies.
 * A vaga em si é extraída pelo JSON-LD da página.
 */
export const definicaoWorkable: DefinicaoConector = {
  motor: "workable",
  versao: "1.0.0",
  urlFormulario: (url) =>
    url.replace(/\/+$/, "").endsWith("/apply") ? url : `${comSufixo(url, "apply")}/`,
  seletorEnviar: "button[type='submit']",
  confirmacao: {
    texto:
      /application (has been )?(submitted|received|sent)|thank you for applying|thanks for applying|candidatura (foi )?enviada/i,
  },
};
