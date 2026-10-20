/**
 * Nenhuma opção do campo corresponde ao valor. Não é falha do conector: o campo fica para o usuário
 * completar na revisão, em vez de o agente assumir o formulário inteiro.
 */
export class ErroSemOpcao extends Error {
  override readonly name = "ErroSemOpcao";
}
