import { z } from "zod";

import { prisma } from "@/shared/infrastructure/database/prisma";

const estadoIbgeSchema = z.object({
  id: z.number().int().positive(),
  sigla: z.string().length(2),
  nome: z.string().min(1),
  regiao: z.object({
    id: z.number().int().positive(),
    sigla: z.string().min(1),
    nome: z.string().min(1),
  }),
});

const cidadeIbgeSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string().min(1),
});

const estadosIbgeSchema = z.array(estadoIbgeSchema);
const cidadesIbgeSchema = z.array(cidadeIbgeSchema);
const IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades";

async function obterJson(url: string) {
  const resposta = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
    headers: { Accept: "application/json" },
  });

  if (!resposta.ok) {
    throw new Error(`IBGE respondeu ${resposta.status} ao consultar ${url}.`);
  }

  return resposta.json();
}

export async function sincronizarLocalidadesIbgeService() {
  const estados = estadosIbgeSchema.parse(
    await obterJson(`${IBGE_URL}/estados?orderBy=nome`),
  );
  const cidadesPorEstado = await Promise.all(
    estados.map(async (estado) => ({
      estado,
      cidades: cidadesIbgeSchema.parse(
        await obterJson(
          `${IBGE_URL}/estados/${encodeURIComponent(estado.sigla)}/municipios?orderBy=nome`,
        ),
      ),
    })),
  );

  const cidades = cidadesPorEstado.flatMap(({ estado, cidades: itens }) =>
    itens.map((cidade) => ({
      id: cidade.id,
      estadoId: estado.id,
      nome: cidade.nome,
      ativo: true,
      origem: "SARH",
    })),
  );

  await prisma.$transaction(
    async (tx) => {
      await tx.cidade.deleteMany({ where: { origem: "SARH" } });
      await tx.estado.deleteMany({ where: { origem: "SARH" } });
      await tx.estado.createMany({
        data: estados.map((estado) => ({
          id: estado.id,
          sigla: estado.sigla.toUpperCase(),
          nome: estado.nome,
          regiaoId: estado.regiao.id,
          regiaoSigla: estado.regiao.sigla,
          regiaoNome: estado.regiao.nome,
          ativo: true,
          origem: "SARH",
        })),
      });
      await tx.cidade.createMany({ data: cidades });
    },
    { timeout: 30_000 },
  );

  return { estados: estados.length, cidades: cidades.length };
}
