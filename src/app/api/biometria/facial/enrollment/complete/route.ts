import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { logger } from "@/lib/observability/logger";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { concluirEnrollmentSchema } from "@/modules/biometria/application/schemas/enrollment.schema";
import { concluirCadastroFacial } from "@/modules/biometria/application/use-cases/concluir-cadastro-facial.usecase";
import { EnrollmentFacialError } from "@/modules/biometria/application/use-cases/enrollment.error";
import { PERMISSOES_BIOMETRIA_FACIAL } from "@/modules/biometria/domain/biometria-facial.rules";

async function postEnrollmentComplete(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return respostaErro(
      "UNAUTHENTICATED",
      "Sua sessão expirou. Faça login novamente.",
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
      "Você não possui permissão para realizar o cadastro facial.",
      403,
    );
  }

  const parsed = concluirEnrollmentSchema.safeParse(await request.json());

  if (!parsed.success) {
    const primeiraFalha = parsed.error.issues[0];
    logger.warn("Payload de conclusao do enrollment facial rejeitado", {
      campo: primeiraFalha?.path.join(".") || "desconhecido",
      codigo: primeiraFalha?.code,
    });

    return respostaErro(
      "INVALID_REQUEST",
      primeiraFalha?.message ??
        "Os dados de conclusão do cadastro facial são inválidos.",
      400,
    );
  }

  try {
    const resultado = await concluirCadastroFacial(
      session.user.id,
      parsed.data,
    );

    revalidatePath("/biometria");
    revalidatePath("/biometria/cadastro");

    return NextResponse.json({
      success: true,
      data: {
        biometriaId: resultado.biometriaId,
        qualidade:
          resultado.qualidadeMedia >= 0.85
            ? "ALTA"
            : resultado.qualidadeMedia >= 0.72
              ? "MÉDIA"
              : "ACEITÁVEL",
        provaDeVida: "APROVADA",
        recadastro: resultado.recadastro,
        concluidoEm: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof EnrollmentFacialError) {
      return respostaErro(error.code, error.message, error.status);
    }

    if (
      error instanceof Error &&
      error.message.includes("BIOMETRIA_FACIAL_")
    ) {
      logger.error("Configuracao de biometria facial ausente ou invalida", {
        error: error.message,
      });

      return respostaErro(
        "BIOMETRIA_CONFIG_INVALIDA",
        "A configuração de criptografia da biometria facial está ausente ou inválida. Verifique as variáveis BIOMETRIA_FACIAL_ENCRYPTION_KEY e BIOMETRIA_FACIAL_TEMPLATE_PEPPER.",
        500,
      );
    }

    logger.error("Falha ao concluir enrollment facial", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });

    return respostaErro(
      "ENROLLMENT_COMPLETE_FAILED",
      "Não foi possível concluir o cadastro facial. Tente novamente.",
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

export const POST = withHttpMetrics(
  "/api/biometria/facial/enrollment/complete",
  postEnrollmentComplete,
);
