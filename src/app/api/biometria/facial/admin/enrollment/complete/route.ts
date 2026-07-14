import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withHttpMetrics } from "@/lib/observability/http";
import { logger } from "@/lib/observability/logger";
import {
  exigirPermissaoBiometriaFacialAdmin,
  respostaErroBiometriaAdmin,
} from "@/modules/biometria/application/services/biometria-facial-admin-permissoes";
import { concluirEnrollmentSchema } from "@/modules/biometria/application/schemas/enrollment.schema";
import { concluirCadastroFacial } from "@/modules/biometria/application/use-cases/concluir-cadastro-facial.usecase";
import { EnrollmentFacialError } from "@/modules/biometria/application/use-cases/enrollment.error";

const concluirEnrollmentAdminSchema = concluirEnrollmentSchema.extend({
  servidorId: z.string().uuid(),
});

async function postBiometriaAdminEnrollmentComplete(request: NextRequest) {
  const payload = await request.json();
  const parsed = concluirEnrollmentAdminSchema.safeParse(payload);

  if (!parsed.success) {
    const primeiraFalha = parsed.error.issues[0];

    return respostaErroBiometriaAdmin(
      "INVALID_REQUEST",
      primeiraFalha?.message ??
        "Os dados de conclusão do cadastro facial são inválidos.",
      400,
    );
  }

  const acesso = await exigirPermissaoBiometriaFacialAdmin([
    "biometriafacial:cadastrar:terceiros",
    "biometriafacial:recadastrar:terceiros",
  ]);

  if (!acesso.autorizado) {
    return respostaErroBiometriaAdmin(
      "FORBIDDEN",
      acesso.message,
      acesso.status,
    );
  }

  try {
    const resultado = await concluirCadastroFacial(
      acesso.session.user.id,
      parsed.data,
    );

    revalidatePath(`/servidores/${parsed.data.servidorId}`);
    revalidatePath("/servidores");

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
      return respostaErroBiometriaAdmin(error.code, error.message, error.status);
    }

    if (
      error instanceof Error &&
      error.message.includes("BIOMETRIA_FACIAL_")
    ) {
      logger.error("Configuracao de biometria facial ausente ou invalida", {
        error: error.message,
      });

      return respostaErroBiometriaAdmin(
        "BIOMETRIA_CONFIG_INVALIDA",
        "A configuração de criptografia da biometria facial está ausente ou inválida.",
        500,
      );
    }

    logger.error("Falha ao concluir enrollment facial administrativo", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });

    return respostaErroBiometriaAdmin(
      "ENROLLMENT_COMPLETE_FAILED",
      "Não foi possível concluir o cadastro facial. Tente novamente.",
      500,
    );
  }
}

export const POST = withHttpMetrics(
  "/api/biometria/facial/admin/enrollment/complete",
  postBiometriaAdminEnrollmentComplete,
);
