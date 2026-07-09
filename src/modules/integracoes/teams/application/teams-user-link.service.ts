import { prisma } from "@/shared/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";

type TeamsUserLinkParams = {
  teamsUserId: string;
  teamsAadObjectId?: string | null;
  teamsConversationId?: string | null;
  tenantId?: string | null;
  serviceUrl?: string | null;
};

export async function buscarVinculoTeams(params: {
  teamsUserId?: string | null;
  teamsAadObjectId?: string | null;
  tenantId?: string | null;
}) {
  if (params.teamsAadObjectId) {
    const porAad = await prisma.teamsUsuarioVinculado.findFirst({
      where: {
        teamsAadObjectId: params.teamsAadObjectId,
        tenantId: params.tenantId ?? null,
        ativo: true,
      },
      include: { usuario: true, servidor: true },
    });

    if (porAad) {
      return porAad;
    }
  }

  if (!params.teamsUserId) {
    return null;
  }

  return prisma.teamsUsuarioVinculado.findFirst({
    where: {
      teamsUserId: params.teamsUserId,
      tenantId: params.tenantId ?? null,
      ativo: true,
    },
    include: { usuario: true, servidor: true },
  });
}

export async function vincularUsuarioTeamsPorEmail(
  params: TeamsUserLinkParams & {
    email?: string | null;
    matricula?: string | null;
  },
) {
  const filtros: Prisma.UsuarioWhereInput[] = [];

  if (params.email) {
    filtros.push({ email: params.email });
  }

  if (params.matricula) {
    filtros.push({ matricula: params.matricula.toUpperCase() });
  }

  const usuario = filtros.length
    ? await prisma.usuario.findFirst({
        where: {
          ativo: true,
          OR: filtros,
        },
        select: {
          id: true,
          servidor: { select: { id: true } },
        },
      })
    : null;

  if (!usuario) {
    return null;
  }

  const existente = await prisma.teamsUsuarioVinculado.findFirst({
    where: {
      teamsUserId: params.teamsUserId,
      tenantId: params.tenantId ?? null,
    },
  });

  if (existente) {
    return prisma.teamsUsuarioVinculado.update({
      where: { id: existente.id },
      data: {
        usuarioId: usuario.id,
        servidorId: usuario.servidor?.id ?? null,
        teamsAadObjectId: params.teamsAadObjectId ?? null,
        teamsConversationId: params.teamsConversationId ?? null,
        serviceUrl: params.serviceUrl ?? null,
        ativo: true,
      },
      include: { usuario: true, servidor: true },
    });
  }

  return prisma.teamsUsuarioVinculado.create({
    data: {
      usuarioId: usuario.id,
      servidorId: usuario.servidor?.id ?? null,
      teamsUserId: params.teamsUserId,
      teamsAadObjectId: params.teamsAadObjectId ?? null,
      teamsConversationId: params.teamsConversationId ?? null,
      tenantId: params.tenantId ?? null,
      serviceUrl: params.serviceUrl ?? null,
      ativo: true,
    },
    include: { usuario: true, servidor: true },
  });
}
