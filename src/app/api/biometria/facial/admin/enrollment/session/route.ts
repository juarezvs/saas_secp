import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  exigirPermissaoBiometriaFacialAdmin,
  respostaErroBiometriaAdmin,
} from "@/modules/biometria/application/services/biometria-facial-admin-permissoes";
import { iniciarEnrollmentSchema } from "@/modules/biometria/application/schemas/enrollment.schema";
import { EnrollmentFacialError } from "@/modules/biometria/application/use-cases/enrollment.error";
import { iniciarSessaoCadastroFacial } from "@/modules/biometria/application/use-cases/iniciar-sessao-cadastro-facial.usecase";

const iniciarEnrollmentAdminSchema = iniciarEnrollmentSchema.extend({
  servidorId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const parsed = iniciarEnrollmentAdminSchema.safeParse(await request.json());

  if (!parsed.success) {
    return respostaErroBiometriaAdmin(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Dados inválidos.",
      400,
    );
  }

  const permissoes =
    parsed.data.modo === "recadastro"
      ? ["biometriafacial:recadastrar:terceiros"]
      : ["biometriafacial:cadastrar:terceiros"];
  const acesso = await exigirPermissaoBiometriaFacialAdmin(permissoes);

  if (!acesso.autorizado) {
    return respostaErroBiometriaAdmin(
      "FORBIDDEN",
      acesso.message,
      acesso.status,
    );
  }

  try {
    const enrollment = await iniciarSessaoCadastroFacial({
      usuarioId: acesso.session.user.id,
      servidorId: parsed.data.servidorId,
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
      return respostaErroBiometriaAdmin(error.code, error.message, error.status);
    }

    console.error("Falha ao iniciar enrollment facial administrativo", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });

    return respostaErroBiometriaAdmin(
      "ENROLLMENT_START_FAILED",
      "Não foi possível iniciar o cadastro facial. Tente novamente.",
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
