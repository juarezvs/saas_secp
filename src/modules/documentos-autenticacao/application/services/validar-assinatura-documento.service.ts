import type { Session } from "next-auth";

import { autenticarUsuarioPorCredenciais } from "@/modules/auth/application/services/autenticar-usuario.service";

type ValidarAssinaturaDocumentoParams = {
  session: Session;
  senha: string;
};

export async function validarAssinaturaDocumento({
  session,
  senha,
}: ValidarAssinaturaDocumentoParams) {
  if (!senha) {
    throw new Error("Informe a senha para assinar o documento.");
  }

  const usuarioAutenticado = await autenticarUsuarioPorCredenciais({
    matricula: session.user.matricula,
    senha,
  });

  if (!usuarioAutenticado || usuarioAutenticado.id !== session.user.id) {
    throw new Error("Senha inválida para assinatura do documento.");
  }

  return {
    usuarioId: usuarioAutenticado.id,
    matricula: usuarioAutenticado.matricula,
    nome: usuarioAutenticado.nome,
    assinadoEm: new Date(),
  };
}
