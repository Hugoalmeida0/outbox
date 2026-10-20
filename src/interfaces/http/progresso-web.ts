import type { EventoPreparo, ProgressoPreparo } from "#aplicacao/portas/progresso-preparo.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import type { EventoExecucao, VagaResumida } from "./contrato.ts";

function resumir(vaga: Vaga): VagaResumida {
  return {
    id: vaga.id,
    empresa: vaga.empresa,
    cargo: vaga.cargo,
    status: vaga.status,
    motivo: vaga.motivo,
  };
}

/** Converte o evento do caso de uso no evento `progresso` do stream, com a vaga reduzida ao essencial. */
export function eventoProgresso(evento: EventoPreparo): EventoExecucao {
  switch (evento.tipo) {
    case "inicio":
      return { tipo: "progresso", evento };
    case "etapa":
      return { tipo: "progresso", evento: { ...evento, vaga: resumir(evento.vaga) } };
    case "concluida":
      return { tipo: "progresso", evento: { ...evento, vaga: resumir(evento.vaga) } };
  }
}

/** Porta `ProgressoPreparo` do site: cada evento do `preparar` vira um evento da execução. */
export class ProgressoWeb implements ProgressoPreparo {
  private readonly publicar: (evento: EventoExecucao) => void;
  private readonly aoFalhar: (erro: unknown) => void;

  constructor(publicar: (evento: EventoExecucao) => void, aoFalhar: (erro: unknown) => void) {
    this.publicar = publicar;
    this.aoFalhar = aoFalhar;
  }

  emitir(evento: EventoPreparo): void {
    // A porta nunca lança: uma falha ao publicar o andamento não pode derrubar o lote.
    try {
      this.publicar(eventoProgresso(evento));
    } catch (erro) {
      this.aoFalhar(erro);
    }
  }
}
