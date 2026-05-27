import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

type RegistrarAuditoriaParams = {
  usuarioId?: string | null;
  entidade: string;
  entidadeId?: string | null;
  acao: string;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  metadados?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  tx?: Tx;
};

export async function registrarAuditoriaEvento({
  usuarioId,
  entidade,
  entidadeId,
  acao,
  dadosAntes,
  dadosDepois,
  metadados,
  ip,
  userAgent,
  tx,
}: RegistrarAuditoriaParams) {
  const client = tx ?? prisma;

  return client.auditoriaEvento.create({
    data: {
      usuarioId: usuarioId ?? null,
      entidade,
      entidadeId: entidadeId ?? null,
      acao,
      dadosAntes: dadosAntes ?? undefined,
      dadosDepois: dadosDepois ?? undefined,
      metadados: metadados ?? undefined,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });
}
