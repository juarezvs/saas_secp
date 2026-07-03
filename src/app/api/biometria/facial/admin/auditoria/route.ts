import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  exigirPermissaoBiometriaFacialAdmin,
  respostaErroBiometriaAdmin,
} from "@/modules/biometria/application/services/biometria-facial-admin-permissoes";
import { prisma } from "@/shared/infrastructure/database/prisma";

const consultarAuditoriaFacialSchema = z.object({
  servidorId: z.string().uuid(),
  limite: z.coerce.number().int().min(1).max(100).default(30),
});

export async function GET(request: NextRequest) {
  const acesso = await exigirPermissaoBiometriaFacialAdmin([
    "biometriafacial:visualizar:auditoria",
  ]);

  if (!acesso.autorizado) {
    return respostaErroBiometriaAdmin(
      "FORBIDDEN",
      acesso.message,
      acesso.status,
    );
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = consultarAuditoriaFacialSchema.safeParse(params);

  if (!parsed.success) {
    return respostaErroBiometriaAdmin(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Dados inválidos.",
      400,
    );
  }

  const [biometria, sessoes, amostras] = await Promise.all([
    prisma.biometriaFacialServidor.findUnique({
      where: { servidorId: parsed.data.servidorId },
      select: { id: true },
    }),
    prisma.sessaoCadastroFacial.findMany({
      where: { servidorId: parsed.data.servidorId },
      select: { id: true },
      orderBy: { criadoEm: "desc" },
      take: parsed.data.limite,
    }),
    prisma.amostraBiometricaFacial.findMany({
      where: { servidorId: parsed.data.servidorId },
      select: { id: true },
      orderBy: { criadoEm: "desc" },
      take: parsed.data.limite,
    }),
  ]);
  const entidadeIds = [
    parsed.data.servidorId,
    biometria?.id,
    ...sessoes.map((item) => item.id),
    ...amostras.map((item) => item.id),
  ].filter((item): item is string => Boolean(item));

  const eventos = await prisma.auditoriaEvento.findMany({
    where: {
      OR: [
        {
          entidade: {
            in: [
              "BiometriaFacialServidor",
              "SessaoCadastroFacial",
              "AmostraBiometricaFacial",
            ],
          },
          entidadeId: {
            in: entidadeIds,
          },
        },
        {
          acao: {
            contains: "BIOMETRIA_FACIAL",
            mode: "insensitive",
          },
          OR: [
            { entidadeId: { in: entidadeIds } },
            {
              dadosDepois: {
                path: ["servidorId"],
                equals: parsed.data.servidorId,
              },
            },
            {
              dadosAntes: {
                path: ["servidorId"],
                equals: parsed.data.servidorId,
              },
            },
          ],
        },
      ],
    },
    include: {
      usuario: {
        select: {
          id: true,
          nome: true,
          matricula: true,
        },
      },
    },
    orderBy: {
      criadoEm: "desc",
    },
    take: parsed.data.limite,
  });

  return NextResponse.json({
    success: true,
    data: eventos.map((evento) => ({
      id: evento.id,
      entidade: evento.entidade,
      entidadeId: evento.entidadeId,
      acao: evento.acao,
      criadoEm: evento.criadoEm.toISOString(),
      usuario: evento.usuario
        ? {
            id: evento.usuario.id,
            nome: evento.usuario.nome,
            matricula: evento.usuario.matricula,
          }
        : null,
    })),
  });
}
