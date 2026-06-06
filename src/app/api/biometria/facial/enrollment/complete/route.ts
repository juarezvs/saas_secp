import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { concluirEnrollmentSchema } from "@/modules/biometria/application/schemas/enrollment.schema";
import { concluirCadastroFacial } from "@/modules/biometria/application/use-cases/concluir-cadastro-facial.usecase";
import { EnrollmentFacialError } from "@/modules/biometria/application/use-cases/enrollment.error";
import { PERMISSOES_BIOMETRIA_FACIAL } from "@/modules/biometria/domain/biometria-facial.rules";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return respostaErro(
      "UNAUTHENTICATED",
      "Sua sessao expirou. Faca login novamente.",
      401,
    );
  }

  const autorizado = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    [
      ...PERMISSOES_BIOMETRIA_FACIAL.cadastrarProprio,
      ...PERMISSOES_BIOMETRIA_FACIAL.recadastrarProprio,
    ],
  );

  if (!autorizado) {
    return respostaErro(
      "FORBIDDEN",
      "Voce nao possui permissao para realizar o cadastro facial.",
      403,
    );
  }

  const parsed = concluirEnrollmentSchema.safeParse(await request.json());

  if (!parsed.success) {
    const primeiraFalha = parsed.error.issues[0];
    console.warn("Payload de conclusao do enrollment facial rejeitado", {
      campo: primeiraFalha?.path.join(".") || "desconhecido",
      codigo: primeiraFalha?.code,
    });

    return respostaErro(
      "INVALID_REQUEST",
      primeiraFalha?.message ??
        "Os dados de conclusao do cadastro facial sao invalidos.",
      400,
    );
  }

  try {
    const resultado = await concluirCadastroFacial(
      session.user.id,
      parsed.data,
    );

    return NextResponse.json({
      success: true,
      data: {
        biometriaId: resultado.biometriaId,
        qualidade:
          resultado.qualidadeMedia >= 0.85
            ? "ALTA"
            : resultado.qualidadeMedia >= 0.72
              ? "MEDIA"
              : "ACEITAVEL",
        provaDeVida: "APROVADA",
        recadastro: resultado.recadastro,
        concluidoEm: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof EnrollmentFacialError) {
      return respostaErro(error.code, error.message, error.status);
    }

    console.error("Falha ao concluir enrollment facial", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });

    return respostaErro(
      "ENROLLMENT_COMPLETE_FAILED",
      "Nao foi possivel concluir o cadastro facial. Tente novamente.",
      500,
    );
  }
}

function respostaErro(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
    },
    { status },
  );
}
