// Servidor MCP stdio `camaleao-segredos` (spec T17, ADR-012): o agente preenche senha, documentos e respostas
// sensíveis sem nunca ver os valores. Iniciado pelo `claude -p` do agente com a config gerada pelo executor.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { criarContainer, type Container } from "#composicao";
import type { IdVaga } from "#dominio/vagas/vaga.ts";

export type ServicoFerramentas = Pick<
  ReturnType<Container["criarServicoSegredos"]>,
  "emailCadastro" | "preencherSenha" | "preencherDadoSensivel" | "preencherRespostaProtegida"
>;

/** `CAMALEAO_HOSTS_PERMITIDOS`: lista separada por vírgula, aceitando `*.` como prefixo. */
export function hostsDoAmbiente(valor: string | undefined): string[] {
  return (valor ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h !== "");
}

/** `CAMALEAO_VAGA_ID`: id positivo, ou `null` quando ausente ou inválido. */
export function vagaDoAmbiente(valor: string | undefined): IdVaga | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? (id as IdVaga) : null;
}

type Resultado = { readonly ok: boolean } | { readonly email: string };

function resposta(resultado: Resultado) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(resultado) }],
    ...("ok" in resultado && !resultado.ok ? { isError: true } : {}),
  };
}

const seletor = z.string().min(1).max(500).describe("seletor CSS do campo na página atual");

/** Registra as quatro ferramentas. Nenhuma devolve o valor preenchido. */
export function criarServidorSegredos(servico: ServicoFerramentas): McpServer {
  const servidor = new McpServer({ name: "camaleao-segredos", version: "1.0.0" });

  servidor.registerTool(
    "email_cadastro",
    { description: "E-mail do candidato para cadastro ou login no ATS." },
    () => resposta(servico.emailCadastro()),
  );

  servidor.registerTool(
    "preencher_senha",
    {
      description:
        "Preenche o campo de senha com a senha única deste site (criada e guardada no cofre na primeira vez). " +
        "Não devolve a senha.",
      inputSchema: { seletor },
    },
    async ({ seletor: alvo }) => resposta(await servico.preencherSenha(alvo)),
  );

  servidor.registerTool(
    "preencher_dado_sensivel",
    {
      description:
        "Preenche CPF, RG ou data de nascimento direto no campo. Use como última ação. Não devolve o valor.",
      inputSchema: {
        chave: z.enum(["cpf", "rg", "dataNascimento"]),
        seletor,
        formato: z
          .enum(["dd/mm/aaaa", "aaaa-mm-dd", "ddmmaaaa"])
          .optional()
          .describe("formato da data"),
      },
    },
    async ({ chave, seletor: alvo, formato }) =>
      resposta(await servico.preencherDadoSensivel(chave, alvo, formato)),
  );

  servidor.registerTool(
    "preencher_resposta_protegida",
    {
      description:
        "Preenche uma resposta sensível (salário, diversidade, documento) pela chave p<n> indicada no prompt. " +
        "Funciona com campo de texto, select, radio e checkbox. Não devolve o valor.",
      inputSchema: { chaveResposta: z.string().regex(/^p\d+$/, "chave no formato p<n>"), seletor },
    },
    async ({ chaveResposta, seletor: alvo }) =>
      resposta(await servico.preencherRespostaProtegida(chaveResposta, alvo)),
  );

  return servidor;
}

async function principal(): Promise<void> {
  const container = criarContainer();
  const servico = container.criarServicoSegredos({
    vagaId: vagaDoAmbiente(process.env.CAMALEAO_VAGA_ID),
    hostsPermitidos: hostsDoAmbiente(process.env.CAMALEAO_HOSTS_PERMITIDOS),
  });
  const servidor = criarServidorSegredos(servico);
  const transporte = new StdioServerTransport();
  transporte.onclose = () => {
    void container.encerrar();
  };
  await servidor.connect(transporte);
}

if (import.meta.main) {
  principal().catch((erro: unknown) => {
    // stdout é do protocolo MCP: diagnóstico só no stderr.
    process.stderr.write(
      `camaleao-segredos: ${erro instanceof Error ? erro.message : String(erro)}\n`,
    );
    process.exitCode = 1;
  });
}
