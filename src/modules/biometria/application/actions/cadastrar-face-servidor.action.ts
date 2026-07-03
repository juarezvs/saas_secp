"use server";

import type { BiometriaFormState } from "../schemas/biometria.schema";

/**
 * Compatibilidade temporaria para componentes legados.
 * Novos cadastros devem usar os endpoints de enrollment com sessão,
 * prova de vida, nonce e persistência criptografada.
 */
export async function cadastrarFaceServidorAction(
  _estadoAnterior: BiometriaFormState,
  _formData: FormData,
): Promise<BiometriaFormState> {
  void _estadoAnterior;
  void _formData;

  return {
    sucesso: false,
    mensagem:
      "Este fluxo de cadastro foi substituído. Acesse Biometria > Cadastro facial para iniciar uma sessão segura.",
  };
}
