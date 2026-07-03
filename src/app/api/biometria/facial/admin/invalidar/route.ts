import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  exigirPermissaoBiometriaFacialAdmin,
  respostaErroBiometriaAdmin,
} from "@/modules/biometria/application/services/biometria-facial-admin-permissoes";
import { prisma } from "@/shared/infrastructure/database/prisma";

const invalidarCadastroFacialSchema = z.object({
  servidorId: z.string().uuid(),
  motivo: z.string().trim().min(3).max(500).optional(),
});

export async function POST(request: NextRequest) {
  const acesso = await exigirPermissaoBiometriaFacialAdmin([
    "biometriafacial:invalidar:global",
  ]);

  if (!acesso.autorizado) {
    return respostaErroBiometriaAdmin(
      "FORBIDDEN",
      acesso.message,
      acesso.status,
    );
  }

  const parsed = invalidarCadastroFacialSchema.safeParse(await request.json());

  if (!parsed.success) {
    return respostaErroBiometriaAdmin(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Dados inválidos.",
      400,
    );
  }

  const biometria = await prisma.biometriaFacialServidor.findUnique({
    where: {
      servidorId: parsed.data.servidorId,
    },
  });

  if (!biometria) {
    return respostaErroBiometriaAdmin(
      "BIOMETRIA_NOT_FOUND",
      "Este servidor ainda não possui cadastro facial.",
      404,
    );
  }

  const atualizada = await prisma.$transaction(async (tx) => {
    const salva = await tx.biometriaFacialServidor.update({
      where: {
        id: biometria.id,
      },
      data: {
        status: "REVOGADO",
        revogadoEm: new Date(),
        revogadoPorUsuarioId: acesso.session.user.id,
        atualizadoPorUsuarioId: acesso.session.user.id,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: acesso.session.user.id,
        entidade: "BiometriaFacialServidor",
        entidadeId: biometria.id,
        acao: "BIOMETRIA_FACIAL_INVALIDADA",
        dadosAntes: {
          servidorId: biometria.servidorId,
          status: biometria.status,
          templateHash: biometria.templateHash,
        },
        dadosDepois: {
          servidorId: salva.servidorId,
          status: salva.status,
          motivo: parsed.data.motivo ?? null,
        },
        metadados: {
          origem: "ADMIN_BIOMETRIA_FACIAL",
        },
      },
    });

    return salva;
  });

  revalidatePath(`/servidores/${parsed.data.servidorId}`);
  revalidatePath("/servidores");

  return NextResponse.json({
    success: true,
    data: {
      id: atualizada.id,
      status: atualizada.status,
      revogadoEm: atualizada.revogadoEm?.toISOString() ?? null,
    },
  });
}
