/**
 * Respostas geradas pelo LLM reaproveitadas entre vagas (mesma pergunta, mesmas opções, mesmo idioma),
 * para que formulários iguais recebam a mesma resposta. Expira e é invalidado quando o master ou o perfil
 * mudam. Guarda só respostas não sensíveis e não específicas da vaga.
 */
export interface CacheRespostas {
  buscar(chave: string): string | null;
  gravar(chave: string, valor: string): void;
}
