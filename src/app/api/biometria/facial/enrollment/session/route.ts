import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { iniciarEnrollmentSchema } from "@/modules/biometria/application/schemas/enrollment.schema";
import { EnrollmentFacialError } from "@/modules/biometria/application/use-cases/enrollment.error";
import { iniciarSessaoCadastroFacial } from "@/modules/biometria/application/use-cases/iniciar-sessao-cadastro-facial.usecase";
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

  const parsed = iniciarEnrollmentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return respostaErro(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Dados invalidos.",
      400,
    );
  }

  const permissoes =
    parsed.data.modo === "recadastro"
      ? PERMISSOES_BIOMETRIA_FACIAL.recadastrarProprio
      : PERMISSOES_BIOMETRIA_FACIAL.cadastrarProprio;
  const autorizado = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    [...permissoes],
  );

  if (!autorizado) {
    return respostaErro(
      "FORBIDDEN",
      "Voce nao possui permissao para realizar o cadastro facial.",
      403,
    );
  }

  try {
    const enrollment = await iniciarSessaoCadastroFacial({
      usuarioId: session.user.id,
      consentimento: parsed.data.consentimento,
      ip: obterIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    if (error instanceof EnrollmentFacialError) {
      return respostaErro(error.code, error.message, error.status);
    }

    console.error("Falha ao iniciar enrollment facial", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });

    return respostaErro(
      "ENROLLMENT_START_FAILED",
      "Nao foi possivel iniciar o cadastro facial. Tente novamente.",
      500,
    );
  }
}

function obterIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")
  );
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
