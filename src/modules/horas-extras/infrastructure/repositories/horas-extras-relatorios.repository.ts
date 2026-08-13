import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarRelatorioAnaliticoHorasExtras(params: {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
  competencia?: string | null;
  orgaoId?: string | null;
}) {
  return prisma.horaExtraCalculoItem.findMany({
    where: {
      calculo: {
        competencia: params.competencia || undefined,
        autorizacao: {
          ...(params.orgaoId
            ? { orgaoId: params.orgaoId }
            : params.escopoGlobal
              ? {}
              : {
                  orgaoId: {
                    in: params.orgaoIds ?? [],
                  },
                }),
        },
      },
    },
    include: {
      calculo: {
        include: {
          autorizacao: {
            include: {
              orgao: true,
              unidade: true,
            },
          },
        },
      },
      servidorAutorizado: true,
      classificacaoIntervalo: true,
    },
    orderBy: [
      { calculo: { competencia: "desc" } },
      { servidorAutorizado: { nomeSnapshot: "asc" } },
      { data: "asc" },
      { inicio: "asc" },
    ],
  });
}

export async function listarRelatorioSinteticoHorasExtras(params: {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
  competencia?: string | null;
  orgaoId?: string | null;
}) {
  const itens = await listarRelatorioAnaliticoHorasExtras(params);
  const grupos = new Map<
    string,
    {
      competencia: string;
      orgao: string;
      unidade: string;
      servidorId: string;
      matricula: string;
      nome: string;
      minutos: number;
      valorCentavos: number;
      rubricas: Set<string>;
      processos: Set<string>;
    }
  >();

  for (const item of itens) {
    const chave = `${item.calculo.competencia}:${item.servidorAutorizadoId}`;
    const grupo = grupos.get(chave) ?? {
      competencia: item.calculo.competencia,
      orgao: item.calculo.autorizacao.orgao.sigla,
      unidade:
        item.servidorAutorizado.unidadeSnapshot ??
        item.calculo.autorizacao.unidade.sigla,
      servidorId: item.servidorAutorizado.servidorId,
      matricula: item.servidorAutorizado.matriculaSnapshot,
      nome: item.servidorAutorizado.nomeSnapshot,
      minutos: 0,
      valorCentavos: 0,
      rubricas: new Set<string>(),
      processos: new Set<string>(),
    };

    grupo.minutos += item.minutos;
    grupo.valorCentavos += item.valorCentavos;

    if (item.rubrica) {
      grupo.rubricas.add(item.rubrica);
    }

    grupo.processos.add(item.calculo.autorizacao.processoSei);
    grupos.set(chave, grupo);
  }

  return [...grupos.values()].map((grupo) => ({
    ...grupo,
    rubricas: [...grupo.rubricas].sort(),
    processos: [...grupo.processos].sort(),
  }));
}
