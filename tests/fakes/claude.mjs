// Executável falso do `claude` para testes (configurado via OUTBOX_CLAUDE_BIN).
// OUTBOX_CLAUDE_ROTEIRO: JSON { "regras": [ { "contem"?, "resultado"?, "erro"?, "atrasoMs"?, "turnos"?, "usos"? } ] }
//   - a primeira regra cujo `contem` aparece no prompt (ou sem `contem`) e com usos restantes é usada;
//   - erro: "limite" | "max_turns" | "falha" | "texto_invalido".
// OUTBOX_CLAUDE_REGISTRO: arquivo JSONL onde cada chamada grava { args, prompt, env }.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const entrada = await new Promise((resolver) => {
  let dados = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (d) => (dados += d));
  process.stdin.on("end", () => resolver(dados));
});

const args = process.argv.slice(2);
const caminhoRoteiro = process.env.OUTBOX_CLAUDE_ROTEIRO;
const caminhoRegistro = process.env.OUTBOX_CLAUDE_REGISTRO;

if (caminhoRegistro) {
  const env = {
    OUTBOX_VAGA_ID: process.env.OUTBOX_VAGA_ID,
    OUTBOX_HOSTS_PERMITIDOS: process.env.OUTBOX_HOSTS_PERMITIDOS,
    MAX_THINKING_TOKENS: process.env.MAX_THINKING_TOKENS,
  };
  appendFileSync(caminhoRegistro, `${JSON.stringify({ args, prompt: entrada, env })}\n`);
}

const roteiro = caminhoRoteiro ? JSON.parse(readFileSync(caminhoRoteiro, "utf8")) : { regras: [] };
const caminhoEstado = `${caminhoRoteiro ?? "roteiro"}.estado.json`;
const estado = existsSync(caminhoEstado) ? JSON.parse(readFileSync(caminhoEstado, "utf8")) : {};

const indice = roteiro.regras.findIndex(
  (r, i) =>
    (!r.contem || entrada.includes(r.contem)) &&
    (r.usos === undefined || (estado[i] ?? 0) < r.usos),
);
const regra = roteiro.regras[indice] ?? { resultado: "" };
if (indice >= 0 && caminhoRoteiro) {
  estado[indice] = (estado[indice] ?? 0) + 1;
  writeFileSync(caminhoEstado, JSON.stringify(estado));
}

if (regra.atrasoMs) await new Promise((r) => setTimeout(r, regra.atrasoMs));

const sessao = `sessao-${indice}`;
switch (regra.erro) {
  case "limite":
    console.log(
      JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: true,
        result: "Claude AI usage limit reached|1760000000",
        session_id: sessao,
        api_error_status: 429,
      }),
    );
    break;
  case "max_turns":
    console.log(
      JSON.stringify({
        type: "result",
        subtype: "error_max_turns",
        is_error: true,
        session_id: sessao,
        num_turns: regra.turnos ?? 40,
      }),
    );
    break;
  case "falha":
    console.error("falha simulada do claude");
    process.exitCode = 1;
    break;
  case "texto_invalido":
    console.log("isto não é json");
    break;
  default:
    console.log(
      JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: false,
        result: regra.resultado ?? "",
        session_id: sessao,
        num_turns: regra.turnos ?? 1,
      }),
    );
}
