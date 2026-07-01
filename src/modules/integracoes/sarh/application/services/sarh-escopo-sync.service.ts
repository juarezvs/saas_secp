import { prisma } from "@/shared/infrastructure/database/prisma";
import type { EscopoOrgaoSessao } from "@/modules/auth/application/services/escopo-orgao.service";

export type EscopoSincronizacaoSarh = {
  global: boolean;
  orgaoIds: string[];
  codigoUnidadeSarh?: number;
  codigosUnidadesSarhPermitidos?: number[];
};

export class SarhEscopoSincronizacaoError extends Error {
  constructor(
    message: string,
    readonly status = 403,
  ) {
    super(message);
    this.name = "SarhEscopoSincronizacaoError";
  }
}

function normalizarCodigoSarh(codigo: unknown) {
  const numero = Number(codigo);
  return Number.isInteger(numero) && numero > 0 ? numero : undefined;
}

function unicos(codigos: Array<number | null | undefined>) {
  return Array.from(
    new Set(codigos.filter((codigo): codigo is number => Boolean(codigo))),
  );
}

export async function obterCodigosUnidadesSarhPermitidos(
  orgaoIds: string[],
) {
  if (orgaoIds.length === 0) {
    return [];
  }

  const [orgaos, unidades] = await Promise.all([
    prisma.orgao.findMany({
      where: { id: { in: orgaoIds } },
      select: { codigoExternoSarh: true },
    }),
    prisma.unidadeOrganizacional.findMany({
      where: {
        orgaoId: { in: orgaoIds },
        codigoExternoSarh: { not: null },
      },
      select: { codigoExternoSarh: true },
    }),
  ]);

  return unicos([
    ...orgaos.map((orgao) => orgao.codigoExternoSarh),
    ...unidades.map((unidade) => unidade.codigoExternoSarh),
  ]).sort((a, b) => a - b);
}

export async function resolverEscopoSincronizacaoSarh(params: {
  escopo: EscopoOrgaoSessao;
  orgaoId?: string | null;
  codigoUnidadeSarh?: unknown;
}): Promise<EscopoSincronizacaoSarh> {
  const codigoUnidadeSarh = normalizarCodigoSarh(params.codigoUnidadeSarh);
  const orgaoIdSelecionado = params.orgaoId?.trim() || null;

  if (params.escopo.global) {
    if (orgaoIdSelecionado) {
      const codigosPermitidos = await obterCodigosUnidadesSarhPermitidos([
        orgaoIdSelecionado,
      ]);

      if (codigosPermitidos.length === 0) {
        throw new SarhEscopoSincronizacaoError(
          "Nenhuma unidade SARH vinculada a seccional selecionada.",
        );
      }

      if (codigoUnidadeSarh && !codigosPermitidos.includes(codigoUnidadeSarh)) {
        throw new SarhEscopoSincronizacaoError(
          "Unidade SARH fora da seccional selecionada.",
        );
      }

      return {
        global: false,
        orgaoIds: [orgaoIdSelecionado],
        codigoUnidadeSarh,
        codigosUnidadesSarhPermitidos: codigoUnidadeSarh
          ? [codigoUnidadeSarh]
          : codigosPermitidos,
      };
    }

    return {
      global: true,
      orgaoIds: [],
      codigoUnidadeSarh,
    };
  }

  if (
    orgaoIdSelecionado &&
    !params.escopo.orgaoIds.includes(orgaoIdSelecionado)
  ) {
    throw new SarhEscopoSincronizacaoError(
      "Seccional fora do escopo do perfil ativo.",
    );
  }

  if (params.escopo.orgaoIds.length === 0) {
    throw new SarhEscopoSincronizacaoError(
      "Perfil ativo sem seccional vinculada para sincronizar o SARH.",
    );
  }

  const codigosPermitidos = await obterCodigosUnidadesSarhPermitidos(
    params.escopo.orgaoIds,
  );

  if (codigosPermitidos.length === 0) {
    throw new SarhEscopoSincronizacaoError(
      "Nenhuma unidade SARH vinculada a seccional do perfil ativo.",
    );
  }

  if (codigoUnidadeSarh && !codigosPermitidos.includes(codigoUnidadeSarh)) {
    throw new SarhEscopoSincronizacaoError(
      "Unidade SARH fora do escopo do perfil ativo.",
    );
  }

  return {
    global: false,
    orgaoIds: params.escopo.orgaoIds,
    codigoUnidadeSarh,
    codigosUnidadesSarhPermitidos: codigoUnidadeSarh
      ? [codigoUnidadeSarh]
      : codigosPermitidos,
  };
}
