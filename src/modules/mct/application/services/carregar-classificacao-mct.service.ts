import { z } from "zod";

import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  condicaoMctSchema,
  regraClassificacaoMctSchema,
} from "@/modules/mct/application/schemas/mct-policy.schema";
import type {
  RegraClassificacaoMct,
  RubricaClassificacaoMct,
} from "@/modules/mct/domain/classificador-multidimensional";

const definicaoRubricaSchema = z.object({
  grupoExclusividade: z.string().nullable().optional(),
  prioridade: z.number().int(),
  exigeAutorizacao: z.boolean(),
  exigeHomologacao: z.boolean(),
  efeitoBancoHoras: z.enum(["NENHUM", "CREDITO", "DEBITO", "COMPENSACAO"]),
});

const efeitoSchema = z.discriminatedUnion("estrategia", [
  z.object({
    estrategia: z.literal("CONSTANTE"),
    quantidadeMinutos: z.number().int().min(0),
  }),
  z.object({
    estrategia: z.literal("CAMPO"),
    campoQuantidade: z.string().min(1),
  }),
]);

export async function carregarClassificacaoMct(params: {
  orgaoId: string;
  politicaVersaoId: string;
  dataReferencia: Date;
}): Promise<{
  catalogo: RubricaClassificacaoMct[];
  regras: RegraClassificacaoMct[];
}> {
  const vigencia = {
    vigenciaInicio: { lte: params.dataReferencia },
    OR: [
      { vigenciaFim: null },
      { vigenciaFim: { gte: params.dataReferencia } },
    ],
  };
  const [rubricas, regras] = await Promise.all([
    prisma.mctRubricaVersao.findMany({
      where: {
        estado: "PUBLICADA",
        AND: [vigencia],
        OR: [{ orgaoId: params.orgaoId }, { orgaoId: null }],
      },
      orderBy: [{ codigo: "asc" }, { versao: "desc" }],
    }),
    prisma.mctRegraVersao.findMany({
      where: {
        orgaoId: params.orgaoId,
        politicaVersaoId: params.politicaVersaoId,
        estado: "PUBLICADA",
        AND: [vigencia],
      },
      include: { efeitos: { include: { rubrica: true } } },
      orderBy: [{ prioridade: "desc" }, { codigo: "asc" }],
    }),
  ]);

  const catalogoPorCodigo = new Map<string, RubricaClassificacaoMct>();
  for (const rubrica of rubricas) {
    if (catalogoPorCodigo.has(rubrica.codigo)) continue;
    const definicao = definicaoRubricaSchema.parse(rubrica.definicao);
    catalogoPorCodigo.set(rubrica.codigo, {
      id: rubrica.id,
      codigo: rubrica.codigo,
      dimensao: rubrica.dimensao,
      grupoExclusividade: definicao.grupoExclusividade,
      prioridade: definicao.prioridade,
      exigeAutorizacao: definicao.exigeAutorizacao,
      exigeHomologacao: definicao.exigeHomologacao,
      efeitoBancoHoras: definicao.efeitoBancoHoras,
    });
  }

  const regrasNormalizadas = regras.map((regra) => {
    const efeitos = regra.efeitos.map((efeito) => {
      const quantidade = efeitoSchema.parse({
        estrategia: efeito.estrategia,
        quantidadeMinutos: efeito.quantidadeMinutos,
        campoQuantidade: efeito.campoQuantidade,
      });
      return {
        rubricaCodigo: efeito.rubrica.codigo,
        escopoTemporal: efeito.escopoTemporal,
        quantidade:
          quantidade.estrategia === "CONSTANTE"
            ? {
                estrategia: "CONSTANTE" as const,
                minutos: quantidade.quantidadeMinutos,
              }
            : {
                estrategia: "CAMPO" as const,
                campo: quantidade.campoQuantidade,
              },
      };
    });
    return regraClassificacaoMctSchema.parse({
      id: regra.id,
      prioridade: regra.prioridade,
      condicao: condicaoMctSchema.parse(regra.condicao),
      efeitos,
    }) as RegraClassificacaoMct;
  });

  if (!catalogoPorCodigo.size || !regrasNormalizadas.length) {
    throw new Error(
      "A politica MCT publicada nao possui catalogo e regras vigentes completos.",
    );
  }
  return {
    catalogo: [...catalogoPorCodigo.values()],
    regras: regrasNormalizadas,
  };
}
